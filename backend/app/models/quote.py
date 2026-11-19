import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, CheckConstraint, Uuid
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Quote(Base):
    __tablename__ = "quotes"

    __table_args__ = (
        CheckConstraint("freight_charges >= 0", name="check_freight_charges_non_negative"),
        CheckConstraint("origin_charges >= 0", name="check_origin_charges_non_negative"),
        CheckConstraint("destination_charges >= 0", name="check_destination_charges_non_negative"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(Uuid(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    carrier_name = Column(String(160), nullable=False)
    freight_charges = Column(Numeric(14, 2), nullable=False)
    origin_charges = Column(Numeric(14, 2), nullable=False)
    destination_charges = Column(Numeric(14, 2), nullable=False)
    transit_time = Column(String(100), nullable=False)
    validity_text = Column(String(100), nullable=False)
    currency_code = Column(String(3), nullable=False, default="INR")
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    rfq = relationship("RFQ", back_populates="quotes")
    supplier = relationship("User", back_populates="quotes")
    bids = relationship("Bid", back_populates="quote", cascade="all, delete-orphan")

    @property
    def total_amount(self) -> Decimal:
        return Decimal(str(self.freight_charges + self.origin_charges + self.destination_charges))

    @property
    def total_initial_amount(self) -> Decimal:
        return self.total_amount
