from datetime import datetime, timezone
import uuid
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models.rfq import RFQ
from backend.app.models.auction_result import AuctionResult
from backend.app.models.auction_activity_log import AuctionActivityLog
from backend.app.models.enums import RFQStatus, EventType, SelectionStatus
from backend.app.services.ranking_service import RankingService


class ClosureService:
    @classmethod
    def evaluate_and_close_auction(
        cls, 
        db: Session, 
        rfq_id: uuid.UUID,
        override_now: Optional[datetime] = None
    ) -> Tuple[bool, Optional[str], Optional[RFQStatus]]:
        """
        Idempotent closure execution.
        Safely re-reads the RFQ with lock, checks whether current time >= effective close,
        and transitions status to CLOSED or FORCE_CLOSED.
        """
        # Lock RFQ row for state transition
        query = db.query(RFQ).filter(RFQ.id == rfq_id)
        if db.bind.dialect.name == "postgresql":
            query = query.with_for_update()
        rfq = query.first()

        if not rfq:
            return False, "RFQ not found", None

        # If already closed or cancelled, exit idempotently
        if rfq.status in [RFQStatus.CLOSED.value, RFQStatus.FORCE_CLOSED.value, RFQStatus.CANCELLED.value]:
            return False, f"RFQ is already {rfq.status}", RFQStatus(rfq.status)

        now = override_now or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        current_close = rfq.current_bid_close_at
        forced_close = rfq.forced_close_at
        if current_close.tzinfo is None:
            current_close = current_close.replace(tzinfo=timezone.utc)
        if forced_close.tzinfo is None:
            forced_close = forced_close.replace(tzinfo=timezone.utc)

        # Verify whether closure time has actually arrived
        if now < current_close:
            return False, "Auction closing time has not yet been reached", RFQStatus(rfq.status)

        # Determine target status: FORCE_CLOSED if now >= forced_close_at, else CLOSED
        if now >= forced_close:
            new_status = RFQStatus.FORCE_CLOSED
            event_type = EventType.FORCE_CLOSED.value
            desc = f"Auction automatically force-closed at forced deadline ({forced_close.isoformat()})."
        else:
            new_status = RFQStatus.CLOSED
            event_type = EventType.AUCTION_CLOSED.value
            desc = f"Auction successfully closed at effective close time ({current_close.isoformat()})."

        rfq.status = new_status.value
        rfq.updated_at = now

        # Create or update AuctionResult snapshot
        existing_result = db.query(AuctionResult).filter(AuctionResult.rfq_id == rfq.id).first()
        l1_info = RankingService.get_l1_supplier(db, rfq.id)

        if not existing_result:
            result = AuctionResult(
                rfq_id=rfq.id,
                closed_at=now,
                selection_status=SelectionStatus.PENDING_SELECTION.value if l1_info else SelectionStatus.NO_VALID_BIDS.value
            )
            if l1_info:
                supplier_id, lowest_amount = l1_info
                result.winning_supplier_id = supplier_id
                result.final_bid_amount = lowest_amount
            db.add(result)
        else:
            existing_result.closed_at = now
            if l1_info:
                supplier_id, lowest_amount = l1_info
                existing_result.winning_supplier_id = supplier_id
                existing_result.final_bid_amount = lowest_amount
                existing_result.selection_status = SelectionStatus.PENDING_SELECTION.value

        # Log closure activity
        activity_log = AuctionActivityLog(
            rfq_id=rfq.id,
            actor_user_id=None,
            event_type=event_type,
            description=desc,
            event_data={
                "closed_at": now.isoformat(),
                "final_status": new_status.value,
                "lowest_bid": float(l1_info[1]) if l1_info else None,
                "l1_supplier_id": str(l1_info[0]) if l1_info else None
            },
            created_at=now
        )
        db.add(activity_log)
        db.commit()

        return True, desc, new_status
