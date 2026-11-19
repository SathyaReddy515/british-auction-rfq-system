import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.quote import Quote
from backend.app.models.bid import Bid
from backend.app.models.rfq import RFQ
from backend.app.models.user import User
from backend.app.models.auction_activity_log import AuctionActivityLog
from backend.app.models.enums import RFQStatus, EventType, UserRole
from backend.app.schemas.quote import QuoteCreate


class QuoteService:
    @classmethod
    def submit_quote(
        cls,
        db: Session,
        rfq_id: uuid.UUID,
        quote_in: QuoteCreate,
        supplier: User
    ) -> Quote:
        """
        Submits an initial commercial quotation for an RFQ.
        Automatically registers the initial total charge as the supplier's baseline bid.
        """
        if supplier.role != UserRole.SUPPLIER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only registered Suppliers can submit quotations."
            )

        rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
        if not rfq:
            raise HTTPException(status_code=404, detail="RFQ not found")

        if rfq.status in [RFQStatus.CLOSED.value, RFQStatus.FORCE_CLOSED.value, RFQStatus.CANCELLED.value]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot submit quotation for RFQ in '{rfq.status}' status."
            )

        existing_quote = db.query(Quote).filter(
            Quote.rfq_id == rfq_id,
            Quote.supplier_id == supplier.id
        ).first()

        if existing_quote:
            raise HTTPException(
                status_code=400,
                detail="Supplier has already submitted an initial quotation for this RFQ."
            )

        now = datetime.now(timezone.utc)
        total_price = quote_in.freight_charges + quote_in.origin_charges + quote_in.destination_charges

        quote = Quote(
            rfq_id=rfq_id,
            supplier_id=supplier.id,
            carrier_name=quote_in.carrier_name,
            freight_charges=quote_in.freight_charges,
            origin_charges=quote_in.origin_charges,
            destination_charges=quote_in.destination_charges,
            transit_time=quote_in.transit_time,
            validity_text=quote_in.validity_text,
            currency_code=quote_in.currency_code,
            created_at=now,
            updated_at=now
        )
        db.add(quote)
        db.flush()

        # Automatically seed baseline bid from the quote total
        initial_bid = Bid(
            rfq_id=rfq_id,
            quote_id=quote.id,
            supplier_id=supplier.id,
            bid_amount=total_price,
            currency_code=quote.currency_code,
            request_id=uuid.uuid4(),
            created_at=now
        )
        db.add(initial_bid)

        # Log quote submission
        log = AuctionActivityLog(
            rfq_id=rfq_id,
            actor_user_id=supplier.id,
            event_type=EventType.QUOTE_SUBMITTED.value,
            description=f"Supplier {supplier.full_name} submitted quotation with Carrier '{quote.carrier_name}' for total {quote.currency_code} {total_price:,.2f}.",
            event_data={
                "carrier_name": quote.carrier_name,
                "freight_charges": float(quote.freight_charges),
                "origin_charges": float(quote.origin_charges),
                "destination_charges": float(quote.destination_charges),
                "total_amount": float(total_price),
                "transit_time": quote.transit_time,
                "validity_text": quote.validity_text
            },
            created_at=now
        )
        db.add(log)
        db.commit()
        db.refresh(quote)
        return quote

    @classmethod
    def get_quotes_for_rfq(
        cls,
        db: Session,
        rfq_id: uuid.UUID,
        current_user: User
    ) -> List[Quote]:
        """
        Retrieves quotes for an RFQ.
        - Buyer sees all quotes with full details.
        - Supplier sees only their own quote to preserve commercial confidentiality.
        """
        query = db.query(Quote).filter(Quote.rfq_id == rfq_id)
        if current_user.role == UserRole.SUPPLIER.value:
            query = query.filter(Quote.supplier_id == current_user.id)
        return query.all()
