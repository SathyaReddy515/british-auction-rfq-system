import uuid
from datetime import timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.auction_activity_log import AuctionActivityLog
from backend.app.schemas.auction_activity_log import ActivityLogResponse

router = APIRouter()


@router.get("/rfqs/{rfq_id}/activity", response_model=List[ActivityLogResponse])
def get_activity_logs(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = (
        db.query(AuctionActivityLog)
        .filter(AuctionActivityLog.rfq_id == rfq_id)
        .order_by(AuctionActivityLog.created_at.desc())
        .all()
    )

    response = []
    for log in logs:
        actor_name = log.actor.full_name if log.actor else "System"
        # If supplier viewing, mask competitor actor names in logs
        if current_user.role == "SUPPLIER" and log.actor_user_id and log.actor_user_id != current_user.id:
            actor_name = f"Supplier #{str(log.actor_user_id)[:4]}"

        created_at = log.created_at
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        response.append({
            "id": log.id,
            "rfq_id": log.rfq_id,
            "actor_user_id": log.actor_user_id,
            "actor_name": actor_name,
            "event_type": log.event_type,
            "description": log.description,
            "event_data": log.event_data or {},
            "created_at": created_at
        })
    return response
