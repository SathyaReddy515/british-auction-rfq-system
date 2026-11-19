import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from backend.app.models.rfq import RFQ
from backend.app.models.auction_config import AuctionConfig
from backend.app.models.user import User
from backend.app.models.bid import Bid
from backend.app.models.quote import Quote
from backend.app.models.auction_activity_log import AuctionActivityLog
from backend.app.models.enums import RFQStatus, EventType, UserRole
from backend.app.schemas.rfq import RFQCreate, RFQUpdate
from backend.app.services.ranking_service import RankingService


class RFQService:
    @classmethod
    def create_rfq(cls, db: Session, rfq_in: RFQCreate, buyer: User) -> RFQ:
        """
        Creates an RFQ with its initial British Auction configuration.
        """
        if buyer.role != UserRole.BUYER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only registered Buyers can create RFQs."
            )

        existing = db.query(RFQ).filter(RFQ.reference_id == rfq_in.reference_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"RFQ with Reference ID '{rfq_in.reference_id}' already exists."
            )

        now = datetime.now(timezone.utc)
        rfq = RFQ(
            reference_id=rfq_in.reference_id,
            name=rfq_in.name,
            buyer_id=buyer.id,
            bid_start_at=rfq_in.bid_start_at,
            initial_bid_close_at=rfq_in.initial_bid_close_at,
            current_bid_close_at=rfq_in.initial_bid_close_at,
            forced_close_at=rfq_in.forced_close_at,
            pickup_service_date=rfq_in.pickup_service_date,
            status=RFQStatus.DRAFT.value,
            created_at=now,
            updated_at=now
        )
        db.add(rfq)
        db.flush()

        # Create British Auction Configuration
        config_in = rfq_in.config
        if config_in:
            config = AuctionConfig(
                rfq_id=rfq.id,
                trigger_window_minutes=config_in.trigger_window_minutes,
                extension_duration_minutes=config_in.extension_duration_minutes,
                trigger_type=config_in.trigger_type.value,
                created_at=now,
                updated_at=now
            )
            db.add(config)

        # Log creation event
        log = AuctionActivityLog(
            rfq_id=rfq.id,
            actor_user_id=buyer.id,
            event_type=EventType.RFQ_CREATED.value,
            description=f"RFQ '{rfq.name}' (Ref: {rfq.reference_id}) created by {buyer.full_name}.",
            event_data={
                "name": rfq.name,
                "reference_id": rfq.reference_id,
                "bid_start_at": rfq.bid_start_at.isoformat(),
                "initial_bid_close_at": rfq.initial_bid_close_at.isoformat(),
                "forced_close_at": rfq.forced_close_at.isoformat(),
                "pickup_service_date": rfq.pickup_service_date.isoformat(),
            },
            created_at=now
        )
        db.add(log)
        db.commit()
        db.refresh(rfq)
        return rfq

    @classmethod
    def publish_rfq(cls, db: Session, rfq_id: uuid.UUID, buyer: User) -> RFQ:
        """
        Transitions RFQ from DRAFT to SCHEDULED or ACTIVE based on bid_start_at.
        """
        rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
        if not rfq:
            raise HTTPException(status_code=404, detail="RFQ not found")
        if rfq.buyer_id != buyer.id:
            raise HTTPException(status_code=403, detail="Not authorized to publish this RFQ")
        if rfq.status != RFQStatus.DRAFT.value:
            raise HTTPException(status_code=400, detail=f"Cannot publish RFQ in '{rfq.status}' status")

        now = datetime.now(timezone.utc)
        start_at = rfq.bid_start_at
        if start_at.tzinfo is None:
            start_at = start_at.replace(tzinfo=timezone.utc)

        target_status = RFQStatus.ACTIVE.value if now >= start_at else RFQStatus.SCHEDULED.value
        rfq.status = target_status
        rfq.updated_at = now

        log = AuctionActivityLog(
            rfq_id=rfq.id,
            actor_user_id=buyer.id,
            event_type=EventType.RFQ_PUBLISHED.value,
            description=f"RFQ published by {buyer.full_name}. Status changed to {target_status}.",
            event_data={"status": target_status},
            created_at=now
        )
        db.add(log)
        db.commit()
        db.refresh(rfq)
        return rfq

    @classmethod
    def list_rfqs(
        cls,
        db: Session,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        buyer_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 20,
        order_by: str = "created_at",
        order_dir: str = "desc"
    ) -> Tuple[List[RFQ], int]:
        """
        Lists RFQs with full search, status filter, and pagination support.
        """
        query = db.query(RFQ)

        if buyer_id:
            query = query.filter(RFQ.buyer_id == buyer_id)

        if status_filter:
            query = query.filter(RFQ.status == status_filter)

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    RFQ.name.ilike(search_pattern),
                    RFQ.reference_id.ilike(search_pattern)
                )
            )

        total = query.count()

        # Sorting
        sort_col = getattr(RFQ, order_by, RFQ.created_at)
        if order_dir.lower() == "asc":
            query = query.order_by(asc(sort_col))
        else:
            query = query.order_by(desc(sort_col))

        rfqs = query.offset(skip).limit(limit).all()
        return rfqs, total

    @classmethod
    def get_rfq_details(cls, db: Session, rfq_id: uuid.UUID) -> RFQ:
        rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
        if not rfq:
            raise HTTPException(status_code=404, detail="RFQ not found")
        return rfq
