import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index, Uuid, JSON
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.models.enums import EventType


class AuctionActivityLog(Base):
    __tablename__ = "auction_activity_logs"

    __table_args__ = (
        Index("ix_activity_logs_rfq_created", "rfq_id", "created_at"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(Uuid(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    event_type = Column(String(40), nullable=False, index=True)
    description = Column(Text, nullable=False)
    event_data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    rfq = relationship("RFQ", back_populates="activity_logs")
    actor = relationship("User")
