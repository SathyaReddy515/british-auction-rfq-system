import uuid
import logging
from datetime import datetime, timezone
from backend.app.tasks.celery_app import celery_app
from backend.app.db.session import SessionLocal
from backend.app.models.rfq import RFQ
from backend.app.models.enums import RFQStatus
from backend.app.services.closure_service import ClosureService

logger = logging.getLogger("auction.tasks")


@celery_app.task(name="backend.app.tasks.closure_tasks.check_auction_closure", bind=True, max_retries=3)
def check_auction_closure(self, rfq_id_str: str):
    """
    Idempotent task that verifies current database state before closing.
    If the auction was extended, it does not close prematurely.
    """
    logger.info(f"Running closure check for RFQ {rfq_id_str}")
    try:
        rfq_id = uuid.UUID(rfq_id_str)
    except ValueError:
        logger.error(f"Invalid UUID: {rfq_id_str}")
        return False

    db = SessionLocal()
    try:
        closed, desc, final_status = ClosureService.evaluate_and_close_auction(db, rfq_id)
        logger.info(f"Closure check completed for RFQ {rfq_id}: closed={closed}, reason={desc}")
        return {"closed": closed, "status": final_status.value if final_status else None, "desc": desc}
    except Exception as e:
        logger.error(f"Error checking auction closure: {e}")
        db.rollback()
        raise self.retry(exc=e, countdown=5)
    finally:
        db.close()


@celery_app.task(name="backend.app.tasks.closure_tasks.reconcile_active_auctions")
def reconcile_active_auctions():
    """
    Periodic reconciliation task scheduled via Celery Beat.
    Checks all ACTIVE and SCHEDULED auctions against server UTC time.
    """
    logger.info("Starting periodic auction reconciliation task...")
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    reconciled_count = 0

    try:
        # 1. Activate SCHEDULED auctions whose start time has arrived
        scheduled_rfqs = db.query(RFQ).filter(RFQ.status == RFQStatus.SCHEDULED.value).all()
        for rfq in scheduled_rfqs:
            start_at = rfq.bid_start_at
            if start_at.tzinfo is None:
                start_at = start_at.replace(tzinfo=timezone.utc)
            if now >= start_at:
                rfq.status = RFQStatus.ACTIVE.value
                rfq.updated_at = now
                reconciled_count += 1
        db.commit()

        # 2. Close ACTIVE auctions whose current or forced close time has arrived
        active_rfqs = db.query(RFQ).filter(RFQ.status == RFQStatus.ACTIVE.value).all()
        for rfq in active_rfqs:
            close_at = rfq.current_bid_close_at
            if close_at.tzinfo is None:
                close_at = close_at.replace(tzinfo=timezone.utc)
            if now >= close_at:
                closed, desc, new_stat = ClosureService.evaluate_and_close_auction(db, rfq.id, override_now=now)
                if closed:
                    reconciled_count += 1

        logger.info(f"Reconciliation completed. State transitions performed: {reconciled_count}")
        return {"reconciled_count": reconciled_count}
    except Exception as e:
        logger.error(f"Error in reconciliation task: {e}")
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
