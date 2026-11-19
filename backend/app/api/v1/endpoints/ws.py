import uuid
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from backend.app.db.session import SessionLocal
from backend.app.core.security import decode_access_token
from backend.app.models.rfq import RFQ
from backend.app.models.user import User
from backend.app.services.ranking_service import RankingService
from backend.app.websocket.connection_manager import ws_manager

logger = logging.getLogger("auction.ws_endpoint")
router = APIRouter()


@router.websocket("/ws/auctions/{rfq_id}")
async def auction_websocket_endpoint(
    websocket: WebSocket,
    rfq_id: str,
    token: str = Query(None)
):
    rfq_uuid = None
    try:
        rfq_uuid = uuid.UUID(rfq_id)
    except ValueError:
        await websocket.close(code=4000, reason="Invalid RFQ UUID")
        return

    current_user = None
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            db = SessionLocal()
            try:
                user_id = uuid.UUID(payload["sub"])
                current_user = db.query(User).filter(User.id == user_id).first()
            finally:
                db.close()

    await ws_manager.connect(rfq_id, websocket)

    # Send initial full state sync
    db = SessionLocal()
    try:
        rfq = db.query(RFQ).filter(RFQ.id == rfq_uuid).first()
        if rfq:
            anonymize = (current_user is not None and current_user.role == "SUPPLIER")
            user_id = current_user.id if current_user else None
            rankings = RankingService.calculate_rankings(db, rfq.id, current_user_id=user_id, anonymize_for_suppliers=anonymize)
            l1_info = RankingService.get_l1_supplier(db, rfq.id)
            config = rfq.auction_config

            initial_state = {
                "type": "AUCTION_STATE",
                "rfq_id": str(rfq.id),
                "status": rfq.status,
                "bid_start_at": rfq.bid_start_at.isoformat(),
                "initial_bid_close_at": rfq.initial_bid_close_at.isoformat(),
                "current_bid_close_at": rfq.current_bid_close_at.isoformat(),
                "forced_close_at": rfq.forced_close_at.isoformat(),
                "current_lowest_bid": float(l1_info[1]) if l1_info else None,
                "config": {
                    "trigger_window_minutes": config.trigger_window_minutes if config else 10,
                    "extension_duration_minutes": config.extension_duration_minutes if config else 5,
                    "trigger_type": config.trigger_type if config else "BID_RECEIVED"
                },
                "rankings": [
                    {
                        "rank": r.rank,
                        "rank_label": r.rank_label,
                        "supplier_id": str(r.supplier_id),
                        "supplier_name": r.supplier_name,
                        "current_bid_amount": float(r.current_bid_amount),
                        "submitted_at": r.submitted_at.isoformat(),
                        "is_current_user": r.is_current_user
                    } for r in rankings
                ]
            }
            await websocket.send_json(initial_state)
    except Exception as e:
        logger.error(f"Error sending initial state over WS: {e}")
    finally:
        db.close()

    try:
        while True:
            data = await websocket.receive_text()
            # Respond to client ping / heartbeat
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(rfq_id, websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        ws_manager.disconnect(rfq_id, websocket)
