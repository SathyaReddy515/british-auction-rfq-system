import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, get_current_supplier
from backend.app.models.user import User
from backend.app.models.quote import Quote
from backend.app.schemas.quote import QuoteCreate, QuoteResponse
from backend.app.services.quote_service import QuoteService

router = APIRouter()


@router.post("/rfqs/{rfq_id}/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def submit_quote(
    rfq_id: uuid.UUID,
    quote_in: QuoteCreate,
    db: Session = Depends(get_db),
    supplier: User = Depends(get_current_supplier)
):
    quote = QuoteService.submit_quote(db, rfq_id, quote_in, supplier)
    return {
        "id": quote.id,
        "rfq_id": quote.rfq_id,
        "supplier_id": quote.supplier_id,
        "carrier_name": quote.carrier_name,
        "freight_charges": quote.freight_charges,
        "origin_charges": quote.origin_charges,
        "destination_charges": quote.destination_charges,
        "total_amount": quote.total_amount,
        "transit_time": quote.transit_time,
        "validity_text": quote.validity_text,
        "currency_code": quote.currency_code,
        "created_at": quote.created_at,
        "updated_at": quote.updated_at,
        "supplier_name": supplier.full_name
    }


@router.get("/rfqs/{rfq_id}/quotes", response_model=List[QuoteResponse])
def get_quotes(
    rfq_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quotes = QuoteService.get_quotes_for_rfq(db, rfq_id, current_user)
    
    response = []
    for q in quotes:
        supplier_name = q.supplier.full_name if (current_user.role == "BUYER" or q.supplier_id == current_user.id) else f"Supplier #{str(q.supplier_id)[:4]}"
        response.append({
            "id": q.id,
            "rfq_id": q.rfq_id,
            "supplier_id": q.supplier_id,
            "carrier_name": q.carrier_name,
            "freight_charges": q.freight_charges,
            "origin_charges": q.origin_charges,
            "destination_charges": q.destination_charges,
            "total_amount": q.total_amount,
            "transit_time": q.transit_time,
            "validity_text": q.validity_text,
            "currency_code": q.currency_code,
            "created_at": q.created_at,
            "updated_at": q.updated_at,
            "supplier_name": supplier_name
        })
    return response
