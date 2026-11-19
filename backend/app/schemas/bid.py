import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class BidCreate(BaseModel):
    bid_amount: Decimal = Field(..., gt=0, description="Total competitive downward bid amount")
    request_id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, description="Idempotency key")


class BidResponse(BaseModel):
    id: uuid.UUID
    rfq_id: uuid.UUID
    quote_id: uuid.UUID
    supplier_id: uuid.UUID
    bid_amount: Decimal
    currency_code: str
    created_at: datetime
    supplier_name: Optional[str] = None
    rank_label: Optional[str] = None

    class Config:
        from_attributes = True


class SupplierRankingItem(BaseModel):
    rank: int
    rank_label: str  # L1, L2, L3, L4...
    supplier_id: uuid.UUID
    supplier_name: str
    current_bid_amount: Decimal
    submitted_at: datetime
    is_current_user: bool = False


class AuctionRankingResponse(BaseModel):
    rfq_id: uuid.UUID
    current_lowest_bid: Optional[Decimal] = None
    rankings: List[SupplierRankingItem] = []
    total_participants: int = 0
