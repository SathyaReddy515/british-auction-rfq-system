import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.models.enums import SelectionStatus


class AuctionResult(Base):
    __tablename__ = "auction_results"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(Uuid(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    winning_supplier_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    final_bid_id = Column(Uuid(as_uuid=True), ForeignKey("bids.id", ondelete="SET NULL"), nullable=True)
    
    final_bid_amount = Column(Numeric(14, 2), nullable=True)
    selection_status = Column(String(30), nullable=False, default=SelectionStatus.PENDING_SELECTION.value)
    closed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    rfq = relationship("RFQ", back_populates="result")
    winning_supplier = relationship("User", back_populates="awarded_results")
    final_bid = relationship("Bid")
