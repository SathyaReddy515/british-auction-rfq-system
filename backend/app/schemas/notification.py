from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    category: str
    payload: dict
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
