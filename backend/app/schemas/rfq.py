import uuid
from datetime import datetime, date, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from backend.app.models.enums import RFQStatus
from backend.app.schemas.auction_config import AuctionConfigBase, AuctionConfigResponse


class RFQBase(BaseModel):
    reference_id: str = Field(..., min_length=2, max_length=60)
    name: str = Field(..., min_length=3, max_length=200)
    bid_start_at: datetime
    initial_bid_close_at: datetime
    forced_close_at: datetime
    pickup_service_date: date


class RFQCreate(RFQBase):
    config: Optional[AuctionConfigBase] = Field(default_factory=AuctionConfigBase)

    @model_validator(mode="after")
    def validate_dates(self):
        start = self.bid_start_at
        close = self.initial_bid_close_at
        forced = self.forced_close_at

        # Ensure timezone-aware UTC
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if close.tzinfo is None:
            close = close.replace(tzinfo=timezone.utc)
        if forced.tzinfo is None:
            forced = forced.replace(tzinfo=timezone.utc)

        if close <= start:
            raise ValueError("Bid Close Date & Time must be strictly later than Bid Start Date & Time")
        if forced <= close:
            raise ValueError("Forced Bid Close Date & Time must be strictly later than Initial Bid Close Date & Time")
        return self


class RFQUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    bid_start_at: Optional[datetime] = None
    initial_bid_close_at: Optional[datetime] = None
    forced_close_at: Optional[datetime] = None
    pickup_service_date: Optional[date] = None


class RFQResponse(RFQBase):
    id: uuid.UUID
    buyer_id: uuid.UUID
    current_bid_close_at: datetime
    status: RFQStatus
    created_at: datetime
    updated_at: datetime
    auction_config: Optional[AuctionConfigResponse] = None
    
    # Computed metrics
    current_lowest_bid: Optional[float] = None
    total_bids_count: int = 0
    total_quotes_count: int = 0

    class Config:
        from_attributes = True


class RFQListResponse(BaseModel):
    total: int
    items: List[RFQResponse]
