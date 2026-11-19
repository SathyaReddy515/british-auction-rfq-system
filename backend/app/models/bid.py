import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, CheckConstraint, Index, Uuid
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Bid(Base):
    __tablename__ = "bids"

    __table_args__ = (
        CheckConstraint("bid_amount > 0", name="check_bid_amount_positive"),
        Index("ix_bids_rfq_supplier_created", "rfq_id", "supplier_id", "created_at"),
        Index("ix_bids_rfq_amount_created", "rfq_id", "bid_amount", "created_at"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(Uuid(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    quote_id = Column(Uuid(as_uuid=True), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    bid_amount = Column(Numeric(14, 2), nullable=False)
    currency_code = Column(String(3), nullable=False, default="INR")
    request_id = Column(Uuid(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    rfq = relationship("RFQ", back_populates="bids")
    quote = relationship("Quote", back_populates="bids")
    supplier = relationship("User", back_populates="bids")
