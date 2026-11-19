import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, CheckConstraint, Uuid
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.models.enums import RFQStatus


class RFQ(Base):
    __tablename__ = "rfqs"

    __table_args__ = (
        CheckConstraint("initial_bid_close_at > bid_start_at", name="check_bid_start_before_close"),
        CheckConstraint("forced_close_at > initial_bid_close_at", name="check_forced_close_after_initial"),
        CheckConstraint("current_bid_close_at <= forced_close_at", name="check_current_close_le_forced"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference_id = Column(String(60), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    buyer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    bid_start_at = Column(DateTime(timezone=True), nullable=False)
    initial_bid_close_at = Column(DateTime(timezone=True), nullable=False)
    current_bid_close_at = Column(DateTime(timezone=True), nullable=False)
    forced_close_at = Column(DateTime(timezone=True), nullable=False)
    pickup_service_date = Column(Date, nullable=False)
    
    status = Column(String(20), nullable=False, default=RFQStatus.DRAFT.value, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    buyer = relationship("User", back_populates="rfqs")
    auction_config = relationship("AuctionConfig", back_populates="rfq", uselist=False, cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="rfq", cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="rfq", cascade="all, delete-orphan")
    activity_logs = relationship("AuctionActivityLog", back_populates="rfq", cascade="all, delete-orphan")
    result = relationship("AuctionResult", back_populates="rfq", uselist=False, cascade="all, delete-orphan")
