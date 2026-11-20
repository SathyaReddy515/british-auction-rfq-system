import uuid
import asyncio
from typing import List
from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, get_current_supplier
from backend.app.models.user import User
from backend.app.models.bid import Bid
from backend.app.schemas.bid import BidCreate, BidResponse, AuctionRankingResponse
from backend.app.services.bidding_service import BiddingService
from backend.app.services.ranking_service import RankingService
from backend.app.websocket.connection_manager import ws_manager

router = APIRouter()


@router.post("/rfqs/{rfq_id}/bids", response_model=BidResponse, status_code=status.HTTP_201_CREATED)
async def submit_bid(
    rfq_id: uuid.UUID,
    bid_in: BidCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    supplier: User = Depends(get_current_supplier)
):
    result = BiddingService.submit_bid(
        db=db,
        rfq_id=rfq_id,
        supplier_id=supplier.id,
        bid_amount=bid_in.bid_amount,
        request_id=bid_in.request_id
    )

    new_bid: Bid = result["bid"]
    is_extended = result["is_extended"]
    new_close = result["new_close_time"]
    extension_reason = result["extension_reason"]

    # Calculate updated rankings
    rankings = RankingService.calculate_rankings(db, rfq_id)
    l1_info = RankingService.get_l1_supplier(db, rfq_id)

    # Broadcast WebSocket update to all connected clients
    ws_event = {
        "type": "NEW_BID",
        "rfq_id": str(rfq_id),
        "bid": {
            "id": str(new_bid.id),
            "supplier_id": str(supplier.id),
            "supplier_name": supplier.full_name,
            "bid_amount": float(new_bid.bid_amount),
            "created_at": new_bid.created_at.isoformat()
        },
        "is_extended": is_extended,
        "new_close_time": new_close.isoformat() if is_extended else None,
        "extension_reason": extension_reason,
        "current_lowest_bid": float(l1_info[1]) if l1_info else float(new_bid.bid_amount),
        "rankings": [
            {
                "rank": r.rank,
                "rank_label": r.rank_label,
                "supplier_id": str(r.supplier_id),
                "supplier_name": r.supplier_name,
                "current_bid_amount": float(r.current_bid_amount),
                "submitted_at": r.submitted_at.isoformat(),
                "is_current_user": False  # WS broadcast; frontend re-derives from supplier_id
            } for r in rankings
        ]
    }
    background_tasks.add_task(ws_manager.broadcast_to_rfq, str(rfq_id), ws_event)

    rank_mapping = {r.supplier_id: r.rank_label for r in rankings}

    return {
        "id": new_bid.id,
        "rfq_id": new_bid.rfq_id,
        "quote_id": new_bid.quote_id,
        "supplier_id": new_bid.supplier_id,
        "bid_amount": new_bid.bid_amount,
        "currency_code": new_bid.currency_code,
        "created_at": new_bid.created_at,
        "supplier_name": supplier.full_name,
        "rank_label": rank_mapping.get(new_bid.supplier_id, "L1")
    }


@router.get("/rfqs/{rfq_id}/bids", response_model=List[BidResponse])
def get_bids(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id)
        .order_by(Bid.created_at.desc(), Bid.id.desc())
        .all()
    )

    rankings = RankingService.calculate_rankings(db, rfq_id)
    rank_mapping = {r.supplier_id: r.rank_label for r in rankings}

    response = []
    for b in bids:
        is_self = (b.supplier_id == current_user.id)
        supplier_name = b.supplier.full_name if (current_user.role == "BUYER" or is_self) else f"Supplier #{str(b.supplier_id)[:4]}"
        
        response.append({
            "id": b.id,
            "rfq_id": b.rfq_id,
            "quote_id": b.quote_id,
            "supplier_id": b.supplier_id,
            "bid_amount": b.bid_amount,
            "currency_code": b.currency_code,
            "created_at": b.created_at,
            "supplier_name": supplier_name,
            "rank_label": rank_mapping.get(b.supplier_id)
        })
    return response


@router.get("/rfqs/{rfq_id}/rankings", response_model=AuctionRankingResponse)
def get_rankings(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    anonymize = (current_user.role == "SUPPLIER")
    rankings = RankingService.calculate_rankings(
        db=db,
        rfq_id=rfq_id,
        current_user_id=current_user.id,
        anonymize_for_suppliers=anonymize
    )
    l1_info = RankingService.get_l1_supplier(db, rfq_id)

    return {
        "rfq_id": rfq_id,
        "current_lowest_bid": l1_info[1] if l1_info else None,
        "rankings": rankings,
        "total_participants": len(rankings)
    }
