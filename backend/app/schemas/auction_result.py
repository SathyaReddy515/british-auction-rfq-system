import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from backend.app.models.enums import SelectionStatus


class SelectWinnerRequest(BaseModel):
    supplier_id: uuid.UUID


class AuctionResultResponse(BaseModel):
    id: uuid.UUID
    rfq_id: uuid.UUID
    winning_supplier_id: Optional[uuid.UUID] = None
    winning_supplier_name: Optional[str] = None
    final_bid_id: Optional[uuid.UUID] = None
    final_bid_amount: Optional[Decimal] = None
    selection_status: SelectionStatus
    closed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
