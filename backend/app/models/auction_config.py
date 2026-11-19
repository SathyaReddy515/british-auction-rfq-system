import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, Uuid
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.models.enums import TriggerType


class AuctionConfig(Base):
    __tablename__ = "auction_configs"

    __table_args__ = (
        CheckConstraint("trigger_window_minutes > 0", name="check_trigger_window_positive"),
        CheckConstraint("extension_duration_minutes > 0", name="check_extension_duration_positive"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(Uuid(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    trigger_window_minutes = Column(Integer, nullable=False, default=10)
    extension_duration_minutes = Column(Integer, nullable=False, default=5)
    trigger_type = Column(String(40), nullable=False, default=TriggerType.BID_RECEIVED.value)
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    rfq = relationship("RFQ", back_populates="auction_config")
