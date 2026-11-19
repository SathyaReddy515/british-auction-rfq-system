import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel
from backend.app.models.enums import EventType


class ActivityLogResponse(BaseModel):
    id: uuid.UUID
    rfq_id: uuid.UUID
    actor_user_id: Optional[uuid.UUID] = None
    actor_name: Optional[str] = None
    event_type: str
    description: str
    event_data: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True
