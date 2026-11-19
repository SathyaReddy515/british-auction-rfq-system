import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from backend.app.models.enums import TriggerType


class AuctionConfigBase(BaseModel):
    trigger_window_minutes: int = Field(10, gt=0, description="Trigger window X in minutes")
    extension_duration_minutes: int = Field(5, gt=0, description="Extension duration Y in minutes")
    trigger_type: TriggerType = Field(TriggerType.BID_RECEIVED, description="Condition to trigger extension")


class AuctionConfigCreate(AuctionConfigBase):
    pass


class AuctionConfigUpdate(BaseModel):
    trigger_window_minutes: Optional[int] = Field(None, gt=0)
    extension_duration_minutes: Optional[int] = Field(None, gt=0)
    trigger_type: Optional[TriggerType] = None


class AuctionConfigResponse(AuctionConfigBase):
    id: uuid.UUID
    rfq_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
