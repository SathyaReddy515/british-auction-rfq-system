import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, get_current_buyer
from backend.app.models.user import User
from backend.app.models.rfq import RFQ
from backend.app.models.auction_result import AuctionResult
from backend.app.models.auction_activity_log import AuctionActivityLog
from backend.app.models.bid import Bid
from backend.app.models.quote import Quote
from backend.app.models.notification import Notification
from backend.app.models.enums import SelectionStatus, EventType
from backend.app.schemas.auction_result import AuctionResultResponse, SelectWinnerRequest
from backend.app.services.closure_service import ClosureService
from backend.app.websocket.connection_manager import ws_manager

router = APIRouter()


@router.get("/rfqs/{rfq_id}/results", response_model=AuctionResultResponse)
def get_results(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = db.query(AuctionResult).filter(AuctionResult.rfq_id == rfq_id).first()
    if not result:
        rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
        if rfq and rfq.status in ["CLOSED", "FORCE_CLOSED"]:
            from backend.app.services.ranking_service import RankingService
            l1_info = RankingService.get_l1_supplier(db, rfq.id)
            now = datetime.now(timezone.utc)
            final_bid = None
            if l1_info:
                final_bid = (
                    db.query(Bid)
                    .filter(Bid.rfq_id == rfq.id, Bid.supplier_id == l1_info[0])
                    .order_by(Bid.created_at.desc(), Bid.id.desc())
                    .first()
                )
            result = AuctionResult(
                rfq_id=rfq.id,
                closed_at=now,
                selection_status="PENDING_SELECTION" if l1_info else "NO_VALID_BIDS",
                winning_supplier_id=l1_info[0] if l1_info else None,
                final_bid_id=final_bid.id if final_bid else None,
                final_bid_amount=l1_info[1] if l1_info else None
            )
            db.add(result)
            db.commit()
            db.refresh(result)
        else:
            raise HTTPException(status_code=404, detail="Auction results not yet available. Auction may still be active.")

    winning_name = result.winning_supplier.full_name if result.winning_supplier else None
    if current_user.role == "SUPPLIER" and result.winning_supplier_id and result.winning_supplier_id != current_user.id:
        winning_name = f"Supplier #{str(result.winning_supplier_id)[:4]}"

    closed_at = result.closed_at
    if closed_at and closed_at.tzinfo is None:
        closed_at = closed_at.replace(tzinfo=timezone.utc)

    created_at = result.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    return {
        "id": result.id,
        "rfq_id": result.rfq_id,
        "winning_supplier_id": result.winning_supplier_id,
        "winning_supplier_name": winning_name,
        "final_bid_id": result.final_bid_id,
        "final_bid_amount": result.final_bid_amount,
        "selection_status": result.selection_status,
        "closed_at": closed_at,
        "created_at": created_at
    }


@router.post("/rfqs/{rfq_id}/select-winner", response_model=AuctionResultResponse)
async def select_winner(
    rfq_id: uuid.UUID,
    request: SelectWinnerRequest,
    db: Session = Depends(get_db),
    buyer: User = Depends(get_current_buyer)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.buyer_id != buyer.id:
        raise HTTPException(status_code=403, detail="Not authorized to award this RFQ")
    if rfq.status not in ["CLOSED", "FORCE_CLOSED"]:
        raise HTTPException(status_code=400, detail="Cannot select winner while auction is still active")

    result = db.query(AuctionResult).filter(AuctionResult.rfq_id == rfq_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Auction result record not found")

    supplier = db.query(User).filter(User.id == request.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Selected supplier not found")

    result.winning_supplier_id = supplier.id
    result.selection_status = SelectionStatus.SELECTED.value
    now = datetime.now(timezone.utc)

    # Activity log
    log = AuctionActivityLog(
        rfq_id=rfq_id,
        actor_user_id=buyer.id,
        event_type=EventType.WINNER_SELECTED.value,
        description=f"Buyer {buyer.full_name} confirmed and awarded RFQ contract to {supplier.full_name}.",
        event_data={
            "winning_supplier_id": str(supplier.id),
            "winning_supplier_name": supplier.full_name,
            "final_amount": float(result.final_bid_amount) if result.final_bid_amount else None
        },
        created_at=now
    )
    db.add(log)

    # Collect all supplier participants (bids or quotes)
    participant_supplier_ids = set()
    bidding_suppliers = db.query(Bid.supplier_id).filter(Bid.rfq_id == rfq_id).distinct().all()
    for (s_id,) in bidding_suppliers:
        participant_supplier_ids.add(str(s_id))
    quoting_suppliers = db.query(Quote.supplier_id).filter(Quote.rfq_id == rfq_id).distinct().all()
    for (s_id,) in quoting_suppliers:
        participant_supplier_ids.add(str(s_id))
    participant_supplier_ids.add(str(supplier.id))

    award_payload = {
        "type": "AWARD_RESULT",
        "rfq_id": str(rfq_id),
        "rfq_name": rfq.name,
        "rfq_reference_id": rfq.reference_id,
        "winner_supplier_id": str(supplier.id),
        "winner_supplier_name": supplier.full_name,
        "final_amount": float(result.final_bid_amount) if result.final_bid_amount else None,
        "awarded_at": now.isoformat(),
        "selection_status": result.selection_status
    }

    for sup_id in participant_supplier_ids:
        notif = Notification(
            user_id=sup_id,
            category="AWARD",
            payload=award_payload,
            read=False,
            created_at=now,
        )
        db.add(notif)

    db.commit()
    db.refresh(result)

    # WebSocket notification (broadcast to all clients connected to this RFQ)
    await ws_manager.broadcast_to_rfq(str(rfq_id), award_payload)

    return {
        "id": result.id,
        "rfq_id": result.rfq_id,
        "winning_supplier_id": result.winning_supplier_id,
        "winning_supplier_name": supplier.full_name,
        "final_bid_id": result.final_bid_id,
        "final_bid_amount": result.final_bid_amount,
        "selection_status": result.selection_status,
        "closed_at": result.closed_at,
        "created_at": result.created_at
    }


@router.post("/rfqs/{rfq_id}/check-closure")
async def trigger_closure_check(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates and closes auction if deadline has passed.
    """
    closed, desc, new_status = ClosureService.evaluate_and_close_auction(db, rfq_id)
    if closed:
        await ws_manager.broadcast_to_rfq(str(rfq_id), {
            "type": "AUCTION_CLOSED" if new_status.value == "CLOSED" else "AUCTION_FORCE_CLOSED",
            "rfq_id": str(rfq_id),
            "status": new_status.value,
            "description": desc
        })
    return {"closed": closed, "description": desc, "status": new_status.value if new_status else None}
