from celery import Celery
from backend.app.core.config import settings

celery_app = Celery(
    "british_auction_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "reconcile-auctions-every-30-seconds": {
            "task": "backend.app.tasks.closure_tasks.reconcile_active_auctions",
            "schedule": 30.0,
        },
    }
)

celery_app.autodiscover_tasks(["backend.app.tasks"])
