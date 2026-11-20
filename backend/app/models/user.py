import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Uuid
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.SUPPLIER.value)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    rfqs = relationship("RFQ", back_populates="buyer", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="supplier", cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="supplier", cascade="all, delete-orphan")
    awarded_results = relationship("AuctionResult", back_populates="winning_supplier")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
