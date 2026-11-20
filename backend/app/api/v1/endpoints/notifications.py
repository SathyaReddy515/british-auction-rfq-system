import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user
from backend.app.models.notification import Notification
from backend.app.models.user import User
from backend.app.schemas.notification import NotificationResponse, NotificationListResponse

router = APIRouter()


@router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == str(current_user.id))
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    items = []
    for n in notifs:
        created_at = n.created_at
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        items.append({
            "id": str(n.id),
            "user_id": str(n.user_id),
            "category": n.category,
            "payload": n.payload or {},
            "read": bool(n.read),
            "created_at": created_at,
        })
    return {"items": items}


@router.patch("/notifications/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        notification_uuid = uuid.UUID(notif_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification ID")

    notif = (
        db.query(Notification)
        .filter(Notification.id == str(notification_uuid), Notification.user_id == str(current_user.id))
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    db.commit()
    db.refresh(notif)
    created_at = notif.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return {
        "id": str(notif.id),
        "user_id": str(notif.user_id),
        "category": notif.category,
        "payload": notif.payload or {},
        "read": bool(notif.read),
        "created_at": created_at,
    }
