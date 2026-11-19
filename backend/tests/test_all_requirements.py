from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
import uuid
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.app.models.rfq import RFQ
from backend.app.models.auction_config import AuctionConfig
from backend.app.models.quote import Quote
from backend.app.models.bid import Bid
from backend.app.models.user import User
from backend.app.models.enums import RFQStatus, TriggerType, SelectionStatus, UserRole
from backend.app.schemas.rfq import RFQCreate
from backend.app.schemas.auction_config import AuctionConfigBase
from backend.app.schemas.quote import QuoteCreate
from backend.app.services.rfq_service import RFQService
from backend.app.services.quote_service import QuoteService
from backend.app.services.ranking_service import RankingService
from backend.app.services.extension_service import ExtensionService
from backend.app.services.bidding_service import BiddingService
from backend.app.services.closure_service import ClosureService


# =====================================================================
# 1. Valid RFQ Creation
# =====================================================================
def test_01_valid_rfq_creation(db_session, buyer_user):
    now = datetime.now(timezone.utc)
    rfq_in = RFQCreate(
        reference_id="RFQ-TEST-001",
        name="Ocean Freight Shanghai to LA",
        bid_start_at=now + timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=3),
        forced_close_at=now + timedelta(hours=5),
        pickup_service_date=date.today() + timedelta(days=10),
        config=AuctionConfigBase(
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_type=TriggerType.BID_RECEIVED
        )
    )
    rfq = RFQService.create_rfq(db_session, rfq_in, buyer_user)
    assert rfq.id is not None
    assert rfq.reference_id == "RFQ-TEST-001"
    assert rfq.status == RFQStatus.DRAFT.value
    assert rfq.auction_config is not None
    assert rfq.auction_config.trigger_window_minutes == 10
    assert rfq.auction_config.extension_duration_minutes == 5
    assert rfq.auction_config.trigger_type == TriggerType.BID_RECEIVED.value


# =====================================================================
# 2. Invalid RFQ Date Configuration
# =====================================================================
def test_02_invalid_rfq_dates():
    now = datetime.now(timezone.utc)
    
    # Case A: Bid Close before Bid Start
    with pytest.raises(ValidationError) as exc_a:
        RFQCreate(
            reference_id="RFQ-BAD-01",
            name="Invalid Start Close",
            bid_start_at=now + timedelta(hours=5),
            initial_bid_close_at=now + timedelta(hours=2),
            forced_close_at=now + timedelta(hours=6),
            pickup_service_date=date.today() + timedelta(days=5),
        )
    assert "Bid Close Date & Time must be strictly later than Bid Start Date & Time" in str(exc_a.value)

    # Case B: Forced Close before Initial Close
    with pytest.raises(ValidationError) as exc_b:
        RFQCreate(
            reference_id="RFQ-BAD-02",
            name="Invalid Forced Close",
            bid_start_at=now + timedelta(hours=1),
            initial_bid_close_at=now + timedelta(hours=4),
            forced_close_at=now + timedelta(hours=3),
            pickup_service_date=date.today() + timedelta(days=5),
        )
    assert "Forced Bid Close Date & Time must be strictly later than Initial Bid Close Date & Time" in str(exc_b.value)


# =====================================================================
# 3. Valid Supplier Quotation
# =====================================================================
def test_03_valid_supplier_quotation(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-Q-01",
        name="Quotation Test RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=2),
        current_bid_close_at=now + timedelta(hours=2),
        forced_close_at=now + timedelta(hours=4),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.commit()

    quote_in = QuoteCreate(
        carrier_name="Maersk Line",
        freight_charges=Decimal("40000.00"),
        origin_charges=Decimal("3000.00"),
        destination_charges=Decimal("2000.00"),
        transit_time="12 Days",
        validity_text="30 Days from submission",
        currency_code="INR"
    )
    quote = QuoteService.submit_quote(db_session, rfq.id, quote_in, supplier_user)
    assert quote.id is not None
    assert quote.total_amount == Decimal("45000.00")
    assert quote.carrier_name == "Maersk Line"
    
    # Automatically created baseline bid
    bids = db_session.query(Bid).filter(Bid.rfq_id == rfq.id).all()
    assert len(bids) == 1
    assert bids[0].bid_amount == Decimal("45000.00")


# =====================================================================
# 4. Bid Submission Before Auction Starts
# =====================================================================
def test_04_bid_before_auction_starts(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-EARLY",
        name="Future Auction",
        buyer_id=buyer_user.id,
        bid_start_at=now + timedelta(hours=2),
        initial_bid_close_at=now + timedelta(hours=5),
        current_bid_close_at=now + timedelta(hours=5),
        forced_close_at=now + timedelta(hours=8),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.SCHEDULED.value
    )
    db_session.add(rfq)
    db_session.flush()

    quote = Quote(
        rfq_id=rfq.id,
        supplier_id=supplier_user.id,
        carrier_name="DHL",
        freight_charges=Decimal("10000.00"),
        origin_charges=Decimal("1000.00"),
        destination_charges=Decimal("1000.00"),
        transit_time="3 Days",
        validity_text="30 Days",
        currency_code="INR"
    )
    db_session.add(quote)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        BiddingService.submit_bid(db_session, rfq.id, supplier_user.id, Decimal("9000.00"), override_now=now)
    assert exc.value.status_code == 400
    assert "ACTIVE" in exc.value.detail or "started" in exc.value.detail


# =====================================================================
# 5. Bid Submission During Active Auction
# =====================================================================
def test_05_bid_during_active_auction(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-ACTIVE-BID",
        name="Active RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=2),
        current_bid_close_at=now + timedelta(hours=2),
        forced_close_at=now + timedelta(hours=5),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    quote = Quote(
        rfq_id=rfq.id,
        supplier_id=supplier_user.id,
        carrier_name="FedEx",
        freight_charges=Decimal("20000.00"),
        origin_charges=Decimal("2000.00"),
        destination_charges=Decimal("1000.00"),
        transit_time="5 Days",
        validity_text="30 Days",
        currency_code="INR"
    )
    db_session.add(quote)
    db_session.commit()

    result = BiddingService.submit_bid(db_session, rfq.id, supplier_user.id, Decimal("21000.00"), override_now=now)
    assert result["bid"].id is not None
    assert result["bid"].bid_amount == Decimal("21000.00")


# =====================================================================
# 6. Bid Submission After Auction Closure
# =====================================================================
def test_06_bid_after_auction_closure(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-CLOSED-BID",
        name="Closed RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=5),
        initial_bid_close_at=now - timedelta(hours=1),
        current_bid_close_at=now - timedelta(hours=1),
        forced_close_at=now + timedelta(hours=1),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.CLOSED.value
    )
    db_session.add(rfq)
    db_session.flush()

    quote = Quote(
        rfq_id=rfq.id,
        supplier_id=supplier_user.id,
        carrier_name="FedEx",
        freight_charges=Decimal("20000.00"),
        origin_charges=Decimal("2000.00"),
        destination_charges=Decimal("1000.00"),
        transit_time="5 Days",
        validity_text="30 Days",
        currency_code="INR"
    )
    db_session.add(quote)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        BiddingService.submit_bid(db_session, rfq.id, supplier_user.id, Decimal("18000.00"), override_now=now)
    assert exc.value.status_code == 400


# =====================================================================
# 7. Higher or Invalid Competitive Bid (Price must be strictly lower)
# =====================================================================
def test_07_higher_or_equal_bid_rejection(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-PRICE-RULE",
        name="Downward Rule RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=2),
        current_bid_close_at=now + timedelta(hours=2),
        forced_close_at=now + timedelta(hours=5),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    quote = Quote(
        rfq_id=rfq.id,
        supplier_id=supplier_user.id,
        carrier_name="MSC",
        freight_charges=Decimal("10000.00"),
        origin_charges=Decimal("1000.00"),
        destination_charges=Decimal("1000.00"),
        transit_time="5 Days",
        validity_text="30 Days",
        currency_code="INR"
    )
    db_session.add(quote)
    db_session.flush()

    bid = Bid(
        rfq_id=rfq.id,
        quote_id=quote.id,
        supplier_id=supplier_user.id,
        bid_amount=Decimal("12000.00"),
        request_id=uuid.uuid4(),
        created_at=now - timedelta(minutes=30)
    )
    db_session.add(bid)
    db_session.commit()

    # Equal bid (12000) rejected
    with pytest.raises(HTTPException) as exc_equal:
        BiddingService.submit_bid(db_session, rfq.id, supplier_user.id, Decimal("12000.00"), override_now=now)
    assert exc_equal.value.status_code == 400
    assert "strictly lower" in exc_equal.value.detail

    # Higher bid (13000) rejected
    with pytest.raises(HTTPException) as exc_higher:
        BiddingService.submit_bid(db_session, rfq.id, supplier_user.id, Decimal("13000.00"), override_now=now)
    assert exc_higher.value.status_code == 400
    assert "strictly lower" in exc_higher.value.detail


# =====================================================================
# 8. Correct L1/L2/L3 Ranking
# =====================================================================
def test_08_correct_l1_l2_l3_ranking(db_session, buyer_user, supplier_user, supplier_user_2):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-RANK-TEST",
        name="Ranking Test RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=2),
        current_bid_close_at=now + timedelta(hours=2),
        forced_close_at=now + timedelta(hours=5),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    q1 = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("50000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add(q1)
    db_session.flush()
    b1 = Bid(rfq_id=rfq.id, quote_id=q1.id, supplier_id=supplier_user.id, bid_amount=Decimal("50000"), created_at=now)
    db_session.add(b1)

    q2 = Quote(rfq_id=rfq.id, supplier_id=supplier_user_2.id, carrier_name="C2", freight_charges=Decimal("48000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add(q2)
    db_session.flush()
    b2 = Bid(rfq_id=rfq.id, quote_id=q2.id, supplier_id=supplier_user_2.id, bid_amount=Decimal("48000"), created_at=now + timedelta(seconds=1))
    db_session.add(b2)
    db_session.commit()

    rankings = RankingService.calculate_rankings(db_session, rfq.id)
    assert len(rankings) == 2
    assert rankings[0].rank_label == "L1"
    assert rankings[0].supplier_id == supplier_user_2.id
    assert rankings[0].current_bid_amount == Decimal("48000")
    assert rankings[1].rank_label == "L2"
    assert rankings[1].supplier_id == supplier_user.id


# =====================================================================
# 9. Equal-Price Bid Handling (Deterministic Earliest Timestamp Wins)
# =====================================================================
def test_09_equal_price_tie_breaking(db_session, buyer_user, supplier_user, supplier_user_2):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-TIE-TEST",
        name="Tie Break RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=2),
        current_bid_close_at=now + timedelta(hours=2),
        forced_close_at=now + timedelta(hours=5),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    q1 = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("40000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    q2 = Quote(rfq_id=rfq.id, supplier_id=supplier_user_2.id, carrier_name="C2", freight_charges=Decimal("40000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add_all([q1, q2])
    db_session.flush()

    t1 = now - timedelta(minutes=10)
    b1 = Bid(rfq_id=rfq.id, quote_id=q1.id, supplier_id=supplier_user.id, bid_amount=Decimal("40000"), created_at=t1)
    t2 = now - timedelta(minutes=10) + timedelta(seconds=5)
    b2 = Bid(rfq_id=rfq.id, quote_id=q2.id, supplier_id=supplier_user_2.id, bid_amount=Decimal("40000"), created_at=t2)
    db_session.add_all([b1, b2])
    db_session.commit()

    rankings = RankingService.calculate_rankings(db_session, rfq.id)
    assert rankings[0].rank_label == "L1"
    assert rankings[0].supplier_id == supplier_user.id
    assert rankings[1].rank_label == "L2"
    assert rankings[1].supplier_id == supplier_user_2.id


# =====================================================================
# 10. Bid Received Inside Trigger Window (BID_RECEIVED)
# =====================================================================
def test_10_bid_received_inside_trigger_window(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    current_close = now + timedelta(minutes=8)
    forced_close = now + timedelta(minutes=60)
    rfq = RFQ(
        reference_id="RFQ-EXT-01",
        name="Extension RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=current_close,
        current_bid_close_at=current_close,
        forced_close_at=forced_close,
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        trigger_type=TriggerType.BID_RECEIVED.value
    )
    db_session.add(config)

    q = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("30000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add(q)
    db_session.commit()

    result = BiddingService.submit_bid(
        db=db_session,
        rfq_id=rfq.id,
        supplier_id=supplier_user.id,
        bid_amount=Decimal("28000.00"),
        override_now=now
    )

    assert result["is_extended"] is True
    assert result["new_close_time"] == current_close + timedelta(minutes=5)
    assert "Extended by 5 min" in result["extension_reason"]


# =====================================================================
# 11. Bid Received Outside Trigger Window (No Extension)
# =====================================================================
def test_11_bid_received_outside_trigger_window(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    current_close = now + timedelta(minutes=30)
    rfq = RFQ(
        reference_id="RFQ-EXT-02",
        name="No Extension RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=current_close,
        current_bid_close_at=current_close,
        forced_close_at=now + timedelta(hours=2),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        trigger_type=TriggerType.BID_RECEIVED.value
    )
    db_session.add(config)

    q = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("30000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add(q)
    db_session.commit()

    result = BiddingService.submit_bid(
        db=db_session,
        rfq_id=rfq.id,
        supplier_id=supplier_user.id,
        bid_amount=Decimal("28000.00"),
        override_now=now
    )

    assert result["is_extended"] is False
    assert result["new_close_time"] == current_close


# =====================================================================
# 12. ANY_SUPPLIER_RANK_CHANGE Trigger
# =====================================================================
def test_12_any_supplier_rank_change_trigger(db_session, buyer_user, supplier_user, supplier_user_2):
    now = datetime.now(timezone.utc)
    current_close = now + timedelta(minutes=6)
    rfq = RFQ(
        reference_id="RFQ-EXT-RANK",
        name="Rank Change RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=current_close,
        current_bid_close_at=current_close,
        forced_close_at=now + timedelta(hours=2),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        trigger_type=TriggerType.ANY_SUPPLIER_RANK_CHANGE.value
    )
    db_session.add(config)

    q1 = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("40000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    q2 = Quote(rfq_id=rfq.id, supplier_id=supplier_user_2.id, carrier_name="C2", freight_charges=Decimal("45000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add_all([q1, q2])
    db_session.flush()

    b1 = Bid(rfq_id=rfq.id, quote_id=q1.id, supplier_id=supplier_user.id, bid_amount=Decimal("40000"), created_at=now - timedelta(minutes=20))
    b2 = Bid(rfq_id=rfq.id, quote_id=q2.id, supplier_id=supplier_user_2.id, bid_amount=Decimal("45000"), created_at=now - timedelta(minutes=15))
    db_session.add_all([b1, b2])
    db_session.commit()

    result = BiddingService.submit_bid(
        db=db_session,
        rfq_id=rfq.id,
        supplier_id=supplier_user_2.id,
        bid_amount=Decimal("38000.00"),
        override_now=now
    )

    assert result["is_extended"] is True
    assert "Supplier ranking change" in result["extension_reason"]


# =====================================================================
# 13. L1_RANK_CHANGE Trigger
# =====================================================================
def test_13_l1_identity_change_trigger(db_session, buyer_user, supplier_user, supplier_user_2):
    now = datetime.now(timezone.utc)
    current_close = now + timedelta(minutes=5)
    rfq = RFQ(
        reference_id="RFQ-EXT-L1",
        name="L1 Identity Change RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=current_close,
        current_bid_close_at=current_close,
        forced_close_at=now + timedelta(hours=2),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        trigger_type=TriggerType.L1_RANK_CHANGE.value
    )
    db_session.add(config)

    q1 = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("50000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    q2 = Quote(rfq_id=rfq.id, supplier_id=supplier_user_2.id, carrier_name="C2", freight_charges=Decimal("55000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add_all([q1, q2])
    db_session.flush()
    b1 = Bid(rfq_id=rfq.id, quote_id=q1.id, supplier_id=supplier_user.id, bid_amount=Decimal("50000"), created_at=now - timedelta(minutes=20))
    b2 = Bid(rfq_id=rfq.id, quote_id=q2.id, supplier_id=supplier_user_2.id, bid_amount=Decimal("55000"), created_at=now - timedelta(minutes=18))
    db_session.add_all([b1, b2])
    db_session.commit()

    # Edge Case Part A: Supplier 1 (already L1) lowers price to 49000 -> NO EXTENSION
    res_a = BiddingService.submit_bid(
        db=db_session,
        rfq_id=rfq.id,
        supplier_id=supplier_user.id,
        bid_amount=Decimal("49000.00"),
        override_now=now
    )
    assert res_a["is_extended"] is False, "Existing L1 price reduction must not trigger L1_RANK_CHANGE"

    # Edge Case Part B: Supplier 2 underbids with 47000 -> L1 IDENTITY CHANGES -> EXTENDS!
    res_b = BiddingService.submit_bid(
        db=db_session,
        rfq_id=rfq.id,
        supplier_id=supplier_user_2.id,
        bid_amount=Decimal("47000.00"),
        override_now=now + timedelta(seconds=1)
    )
    assert res_b["is_extended"] is True
    assert "L1 lowest bidder identity changed" in res_b["extension_reason"]


# =====================================================================
# 14. Multiple Consecutive Extensions
# =====================================================================
def test_14_multiple_consecutive_extensions(db_session, buyer_user, supplier_user, supplier_user_2):
    now = datetime.now(timezone.utc)
    initial_close = now + timedelta(minutes=8)
    forced_close = now + timedelta(minutes=60)
    rfq = RFQ(
        reference_id="RFQ-MULTI-EXT",
        name="Multi Extension RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=initial_close,
        current_bid_close_at=initial_close,
        forced_close_at=forced_close,
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        trigger_type=TriggerType.BID_RECEIVED.value
    )
    db_session.add(config)

    q1 = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("50000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    q2 = Quote(rfq_id=rfq.id, supplier_id=supplier_user_2.id, carrier_name="C2", freight_charges=Decimal("50000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add_all([q1, q2])
    db_session.commit()

    res1 = BiddingService.submit_bid(db_session, rfq.id, supplier_user.id, Decimal("48000"), override_now=now)
    assert res1["is_extended"] is True
    expected_close_1 = initial_close + timedelta(minutes=5)
    assert res1["new_close_time"] == expected_close_1

    res2 = BiddingService.submit_bid(db_session, rfq.id, supplier_user_2.id, Decimal("46000"), override_now=now + timedelta(minutes=5))
    assert res2["is_extended"] is True
    expected_close_2 = expected_close_1 + timedelta(minutes=5)
    assert res2["new_close_time"] == expected_close_2


# =====================================================================
# 15. Extension Capped at Forced Close
# =====================================================================
def test_15_extension_capped_at_forced_close(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    current_close = now + timedelta(minutes=5)
    forced_close = current_close + timedelta(minutes=2)
    rfq = RFQ(
        reference_id="RFQ-CAP-TEST",
        name="Capped RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=current_close,
        current_bid_close_at=current_close,
        forced_close_at=forced_close,
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=10,
        extension_duration_minutes=10,
        trigger_type=TriggerType.BID_RECEIVED.value
    )
    db_session.add(config)

    q = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("30000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add(q)
    db_session.commit()

    res = BiddingService.submit_bid(db_session, rfq.id, supplier_user.id, Decimal("25000"), override_now=now)
    assert res["is_extended"] is True
    assert res["new_close_time"] == forced_close
    assert "Capped at Forced Close Time" in res["extension_reason"]


# =====================================================================
# 16. Auction Forced Closure
# =====================================================================
def test_16_auction_forced_closure(db_session, buyer_user):
    now = datetime.now(timezone.utc)
    forced_close = now - timedelta(minutes=1)
    rfq = RFQ(
        reference_id="RFQ-FORCE-CLOSE",
        name="Force Close RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=2),
        initial_bid_close_at=now - timedelta(minutes=30),
        current_bid_close_at=forced_close,
        forced_close_at=forced_close,
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.commit()

    closed, desc, status = ClosureService.evaluate_and_close_auction(db_session, rfq.id, override_now=now)
    assert closed is True
    assert status == RFQStatus.FORCE_CLOSED
    assert rfq.status == RFQStatus.FORCE_CLOSED.value


# =====================================================================
# 17. Simultaneous Bids Simulation
# =====================================================================
def test_17_simultaneous_bids_simulation(db_session, buyer_user, supplier_user, supplier_user_2):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-CONCURRENCY",
        name="Concurrency RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=2),
        current_bid_close_at=now + timedelta(hours=2),
        forced_close_at=now + timedelta(hours=5),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.flush()

    q1 = Quote(rfq_id=rfq.id, supplier_id=supplier_user.id, carrier_name="C1", freight_charges=Decimal("50000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    q2 = Quote(rfq_id=rfq.id, supplier_id=supplier_user_2.id, carrier_name="C2", freight_charges=Decimal("50000"), origin_charges=Decimal("0"), destination_charges=Decimal("0"), transit_time="1d", validity_text="1d")
    db_session.add_all([q1, q2])
    db_session.commit()

    bids_data = [
        (supplier_user.id, Decimal("48000")),
        (supplier_user_2.id, Decimal("47000")),
        (supplier_user.id, Decimal("46000")),
        (supplier_user_2.id, Decimal("45000")),
        (supplier_user.id, Decimal("44000")),
    ]

    for i, (supplier_id, amount) in enumerate(bids_data, start=1):
        res = BiddingService.submit_bid(db_session, rfq.id, supplier_id, amount, override_now=now + timedelta(seconds=i))
        assert res["bid"].bid_amount == amount

    rankings = RankingService.calculate_rankings(db_session, rfq.id)
    assert rankings[0].rank_label == "L1"
    assert rankings[0].supplier_id == supplier_user.id
    assert rankings[0].current_bid_amount == Decimal("44000")
    assert rankings[1].rank_label == "L2"
    assert rankings[1].supplier_id == supplier_user_2.id
    assert rankings[1].current_bid_amount == Decimal("45000")


# =====================================================================
# 18. Duplicate Background Task Execution (Idempotency)
# =====================================================================
def test_18_duplicate_task_execution_idempotency(db_session, buyer_user):
    now = datetime.now(timezone.utc)
    rfq = RFQ(
        reference_id="RFQ-IDEMP",
        name="Idempotency RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=2),
        initial_bid_close_at=now - timedelta(minutes=5),
        current_bid_close_at=now - timedelta(minutes=5),
        forced_close_at=now + timedelta(hours=1),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.commit()

    # 1st run
    closed1, desc1, stat1 = ClosureService.evaluate_and_close_auction(db_session, rfq.id, override_now=now)
    assert closed1 is True
    assert stat1 == RFQStatus.CLOSED

    # 2nd run
    closed2, desc2, stat2 = ClosureService.evaluate_and_close_auction(db_session, rfq.id, override_now=now)
    assert closed2 is False
    assert "already CLOSED" in desc2


# =====================================================================
# 19. Scheduled Closure After An Extension (Stale Task Protection)
# =====================================================================
def test_19_scheduled_closure_after_extension(db_session, buyer_user):
    now = datetime.now(timezone.utc)
    extended_close = now + timedelta(minutes=5)
    rfq = RFQ(
        reference_id="RFQ-STALE-CHECK",
        name="Stale Task RFQ",
        buyer_id=buyer_user.id,
        bid_start_at=now - timedelta(hours=1),
        initial_bid_close_at=now,
        current_bid_close_at=extended_close,
        forced_close_at=now + timedelta(hours=1),
        pickup_service_date=date.today() + timedelta(days=5),
        status=RFQStatus.ACTIVE.value
    )
    db_session.add(rfq)
    db_session.commit()

    closed, desc, stat = ClosureService.evaluate_and_close_auction(db_session, rfq.id, override_now=now)
    assert closed is False
    assert rfq.status == RFQStatus.ACTIVE.value
    assert "not yet been reached" in desc


# =====================================================================
# 20. Unauthorized Access Rejection
# =====================================================================
def test_20_unauthorized_role_enforcement(db_session, buyer_user, supplier_user):
    now = datetime.now(timezone.utc)
    rfq_in = RFQCreate(
        reference_id="RFQ-ILLEGAL",
        name="Supplier trying to create RFQ",
        bid_start_at=now + timedelta(hours=1),
        initial_bid_close_at=now + timedelta(hours=2),
        forced_close_at=now + timedelta(hours=3),
        pickup_service_date=date.today() + timedelta(days=1)
    )
    # Supplier attempting to create RFQ -> FORBIDDEN (403)
    with pytest.raises(HTTPException) as exc_rfq:
        RFQService.create_rfq(db_session, rfq_in, supplier_user)
    assert exc_rfq.value.status_code == 403

    # Buyer attempting to submit quote -> FORBIDDEN (403)
    quote_in = QuoteCreate(
        carrier_name="Illegal Carrier",
        freight_charges=Decimal("1000.00"),
        origin_charges=Decimal("100.00"),
        destination_charges=Decimal("100.00"),
        transit_time="1d",
        validity_text="1d",
        currency_code="INR"
    )
    dummy_uuid = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_quote:
        QuoteService.submit_quote(db_session, dummy_uuid, quote_in, buyer_user)
    assert exc_quote.value.status_code == 403
