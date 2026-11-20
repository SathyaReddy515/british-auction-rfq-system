import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.rfq import RFQ
from backend.app.models.auction_config import AuctionConfig
from backend.app.models.quote import Quote
from backend.app.models.bid import Bid
from backend.app.models.user import User
from backend.app.models.auction_activity_log import AuctionActivityLog
from backend.app.models.enums import RFQStatus, EventType, UserRole
from backend.app.services.ranking_service import RankingService
from backend.app.services.extension_service import ExtensionService


class BiddingService:
    @classmethod
    def submit_bid(
        cls,
        db: Session,
        rfq_id: uuid.UUID,
        supplier_id: uuid.UUID,
        bid_amount: Decimal,
        request_id: Optional[uuid.UUID] = None,
        override_now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Processes a competitive downward bid inside an atomic transaction with row-level locking.
        Validates business rules:
        - RFQ is ACTIVE and server time < effective close time
        - Supplier is authorized and has submitted an initial baseline quotation
        - Bid amount strictly lowers previous bid
        - Evaluates dynamic extension triggers (BID_RECEIVED, ANY_SUPPLIER_RANK_CHANGE, L1_RANK_CHANGE)
        - Enforces forced close cap
        - Records activity logs and commits transaction
        """
        now = override_now or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        # 1. Row-level lock on the target RFQ
        query = db.query(RFQ).filter(RFQ.id == rfq_id)
        if db.bind.dialect.name == "postgresql":
            query = query.with_for_update()
        rfq = query.first()

        if not rfq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"RFQ with ID {rfq_id} not found."
            )

        # Auto-activate if SCHEDULED and start time reached
        if rfq.status == RFQStatus.SCHEDULED.value:
            start_at = rfq.bid_start_at
            if start_at.tzinfo is None:
                start_at = start_at.replace(tzinfo=timezone.utc)
            if now >= start_at:
                rfq.status = RFQStatus.ACTIVE.value

        # Validate auction lifecycle state
        if rfq.status != RFQStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot bid on RFQ in '{rfq.status}' status. Auction must be ACTIVE."
            )

        # Validate timing
        start_at = rfq.bid_start_at
        close_at = rfq.current_bid_close_at
        if start_at.tzinfo is None:
            start_at = start_at.replace(tzinfo=timezone.utc)
        if close_at.tzinfo is None:
            close_at = close_at.replace(tzinfo=timezone.utc)

        if now < start_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bidding has not yet started for this RFQ."
            )

        if now >= close_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Auction bidding period has already closed."
            )

        # 2. Check Supplier authorization & participation quote
        supplier = db.query(User).filter(User.id == supplier_id).first()
        if not supplier or supplier.role != UserRole.SUPPLIER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only registered suppliers can submit bids."
            )

        quote = db.query(Quote).filter(
            Quote.rfq_id == rfq_id,
            Quote.supplier_id == supplier_id
        ).first()

        # 3. Check downward price rule
        latest_supplier_bid = (
            db.query(Bid)
            .filter(Bid.rfq_id == rfq_id, Bid.supplier_id == supplier_id)
            .order_by(Bid.created_at.desc())
            .first()
        )

        if not quote and not latest_supplier_bid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supplier must submit an initial quotation breakdown before participating in competitive bidding."
            )

        previous_price = latest_supplier_bid.bid_amount if latest_supplier_bid else quote.total_amount
        if bid_amount >= previous_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bid amount ({bid_amount}) must be strictly lower than your previous price ({previous_price})."
            )

        bid_currency = quote.currency_code if quote else latest_supplier_bid.currency_code
        carrier_name = quote.carrier_name if quote else "Existing Participant"

        # Check idempotency
        req_id = request_id or uuid.uuid4()
        existing_bid = db.query(Bid).filter(Bid.request_id == req_id).first()
        if existing_bid:
            return {
                "bid": existing_bid,
                "is_extended": False,
                "new_close_time": rfq.current_bid_close_at,
                "extension_reason": None,
                "is_duplicate": True
            }

        # 4. Snapshot state before bid
        ranks_before = RankingService.get_rank_mapping(db, rfq_id)
        l1_before_info = RankingService.get_l1_supplier(db, rfq_id)
        l1_before_id = l1_before_info[0] if l1_before_info else None

        # 5. Insert new bid
        new_bid = Bid(
            rfq_id=rfq_id,
            quote_id=quote.id if quote else latest_supplier_bid.quote_id,
            supplier_id=supplier_id,
            bid_amount=bid_amount,
            currency_code=quote.currency_code if quote else latest_supplier_bid.currency_code,
            request_id=req_id,
            created_at=now
        )
        db.add(new_bid)
        db.flush()  # Make visible to subsequent queries in this session

        # 6. Snapshot state after bid
        ranks_after = RankingService.get_rank_mapping(db, rfq_id)
        l1_after_info = RankingService.get_l1_supplier(db, rfq_id)
        l1_after_id = l1_after_info[0] if l1_after_info else None

        # 7. Evaluate dynamic extension
        config = rfq.auction_config
        is_extended = False
        extension_reason = None
        new_close = rfq.current_bid_close_at

        if config:
            is_extended, new_close, extension_reason = ExtensionService.evaluate_and_calculate_extension(
                rfq=rfq,
                config=config,
                bid_timestamp=now,
                ranks_before=ranks_before,
                ranks_after=ranks_after,
                l1_before_id=l1_before_id,
                l1_after_id=l1_after_id
            )

            if is_extended:
                rfq.current_bid_close_at = new_close
                rfq.updated_at = now
                
                # Log extension event
                ext_log = AuctionActivityLog(
                    rfq_id=rfq.id,
                    actor_user_id=supplier_id,
                    event_type=EventType.AUCTION_EXTENDED.value,
                    description=extension_reason or f"Auction extended by {config.extension_duration_minutes} minutes.",
                    event_data={
                        "previous_close_at": close_at.isoformat(),
                        "new_close_at": new_close.isoformat(),
                        "trigger_type": config.trigger_type,
                        "extension_minutes": config.extension_duration_minutes,
                        "bid_amount": float(bid_amount),
                        "supplier_id": str(supplier_id)
                    },
                    created_at=now
                )
                db.add(ext_log)

        # 8. Record Bid Activity Log
        bid_log = AuctionActivityLog(
            rfq_id=rfq.id,
            actor_user_id=supplier_id,
            event_type=EventType.BID_SUBMITTED.value,
            description=f"Supplier submitted competitive downward bid of {bid_currency} {bid_amount:,.2f}.",
            event_data={
                "bid_amount": float(bid_amount),
                "previous_price": float(previous_price),
                "supplier_id": str(supplier_id),
                "carrier_name": carrier_name,
                "current_rank": ranks_after.get(supplier_id)
            },
            created_at=now
        )
        db.add(bid_log)

        # 9. Record Rank Change Log if applicable
        if ranks_before.get(supplier_id) != ranks_after.get(supplier_id):
            old_rank = f"L{ranks_before[supplier_id]}" if supplier_id in ranks_before else "Unranked"
            new_rank = f"L{ranks_after[supplier_id]}"
            rank_log = AuctionActivityLog(
                rfq_id=rfq.id,
                actor_user_id=supplier_id,
                event_type=EventType.RANK_CHANGED.value,
                description=f"Supplier rank changed from {old_rank} to {new_rank} after bid submission.",
                event_data={
                    "supplier_id": str(supplier_id),
                    "old_rank": old_rank,
                    "new_rank": new_rank
                },
                created_at=now
            )
            db.add(rank_log)

        db.commit()
        db.refresh(new_bid)
        db.refresh(rfq)

        normalized_close = new_close
        if normalized_close.tzinfo is None:
            normalized_close = normalized_close.replace(tzinfo=timezone.utc)

        return {
            "bid": new_bid,
            "is_extended": is_extended,
            "new_close_time": normalized_close,
            "extension_reason": extension_reason,
            "ranks_after": ranks_after,
            "current_lowest_bid": l1_after_info[1] if l1_after_info else bid_amount
        }
