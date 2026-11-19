import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, get_current_buyer
from backend.app.models.user import User
from backend.app.models.rfq import RFQ
from backend.app.models.auction_config import AuctionConfig
from backend.app.schemas.rfq import RFQCreate, RFQResponse, RFQListResponse
from backend.app.schemas.auction_config import AuctionConfigBase, AuctionConfigResponse
from backend.app.services.rfq_service import RFQService
from backend.app.services.ranking_service import RankingService

router = APIRouter()


def enrich_rfq_response(rfq: RFQ, db: Session) -> dict:
    l1_info = RankingService.get_l1_supplier(db, rfq.id)
    lowest_bid = float(l1_info[1]) if l1_info else None
    
    return {
        "id": rfq.id,
        "reference_id": rfq.reference_id,
        "name": rfq.name,
        "buyer_id": rfq.buyer_id,
        "bid_start_at": rfq.bid_start_at,
        "initial_bid_close_at": rfq.initial_bid_close_at,
        "current_bid_close_at": rfq.current_bid_close_at,
        "forced_close_at": rfq.forced_close_at,
        "pickup_service_date": rfq.pickup_service_date,
        "status": rfq.status,
        "created_at": rfq.created_at,
        "updated_at": rfq.updated_at,
        "auction_config": rfq.auction_config,
        "current_lowest_bid": lowest_bid,
        "total_bids_count": len(rfq.bids) if rfq.bids else 0,
        "total_quotes_count": len(rfq.quotes) if rfq.quotes else 0,
    }


@router.get("", response_model=RFQListResponse)
def list_rfqs(
    search: Optional[str] = Query(None, description="Search by name or reference ID"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, SCHEDULED, ACTIVE, CLOSED, FORCE_CLOSED)"),
    buyer_only: bool = Query(False, description="Filter to current buyer's created RFQs"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer_id = current_user.id if (buyer_only and current_user.role == "BUYER") else None
    rfqs, total = RFQService.list_rfqs(
        db=db,
        search=search,
        status_filter=status,
        buyer_id=buyer_id,
        skip=skip,
        limit=limit,
        order_by=order_by,
        order_dir=order_dir
    )
    
    enriched_items = [enrich_rfq_response(r, db) for r in rfqs]
    return {"total": total, "items": enriched_items}


@router.post("", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
def create_rfq(
    rfq_in: RFQCreate,
    db: Session = Depends(get_db),
    buyer: User = Depends(get_current_buyer)
):
    rfq = RFQService.create_rfq(db, rfq_in, buyer)
    return enrich_rfq_response(rfq, db)


@router.get("/{rfq_id}", response_model=RFQResponse)
def get_rfq(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rfq = RFQService.get_rfq_details(db, rfq_id)
    return enrich_rfq_response(rfq, db)


@router.post("/{rfq_id}/publish", response_model=RFQResponse)
def publish_rfq(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    buyer: User = Depends(get_current_buyer)
):
    rfq = RFQService.publish_rfq(db, rfq_id, buyer)
    return enrich_rfq_response(rfq, db)


@router.post("/{rfq_id}/config", response_model=AuctionConfigResponse)
def configure_auction(
    rfq_id: uuid.UUID,
    config_in: AuctionConfigBase,
    db: Session = Depends(get_db),
    buyer: User = Depends(get_current_buyer)
):
    rfq = RFQService.get_rfq_details(db, rfq_id)
    if rfq.buyer_id != buyer.id:
        raise HTTPException(status_code=403, detail="Not authorized to configure this RFQ")
    if rfq.status not in ["DRAFT", "SCHEDULED"]:
        raise HTTPException(status_code=400, detail="Cannot alter auction configuration once active or closed")

    config = db.query(AuctionConfig).filter(AuctionConfig.rfq_id == rfq_id).first()
    if not config:
        config = AuctionConfig(
            rfq_id=rfq_id,
            trigger_window_minutes=config_in.trigger_window_minutes,
            extension_duration_minutes=config_in.extension_duration_minutes,
            trigger_type=config_in.trigger_type.value
        )
        db.add(config)
    else:
        config.trigger_window_minutes = config_in.trigger_window_minutes
        config.extension_duration_minutes = config_in.extension_duration_minutes
        config.trigger_type = config_in.trigger_type.value

    db.commit()
    db.refresh(config)
    return config
