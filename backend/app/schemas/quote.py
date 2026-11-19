import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class QuoteBase(BaseModel):
    carrier_name: str = Field(..., min_length=2, max_length=160)
    freight_charges: Decimal = Field(..., ge=0, description="Freight charges (non-negative)")
    origin_charges: Decimal = Field(..., ge=0, description="Origin charges (non-negative)")
    destination_charges: Decimal = Field(..., ge=0, description="Destination charges (non-negative)")
    transit_time: str = Field(..., min_length=1, max_length=100, description="e.g. 5-7 Business Days")
    validity_text: str = Field(..., min_length=1, max_length=100, description="e.g. 30 Days from submission")
    currency_code: str = Field("INR", min_length=3, max_length=3)


class QuoteCreate(QuoteBase):
    pass


class QuoteResponse(QuoteBase):
    id: uuid.UUID
    rfq_id: uuid.UUID
    supplier_id: uuid.UUID
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    
    # Optional supplier display name (anonymized for competing suppliers)
    supplier_name: Optional[str] = None

    class Config:
        from_attributes = True
