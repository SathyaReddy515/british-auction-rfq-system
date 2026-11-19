import uuid
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
from backend.app.db.session import SessionLocal, Base, engine
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.models.rfq import RFQ
from backend.app.models.auction_config import AuctionConfig
from backend.app.models.quote import Quote
from backend.app.models.bid import Bid
from backend.app.models.auction_activity_log import AuctionActivityLog
from backend.app.models.auction_result import AuctionResult
from backend.app.models.enums import UserRole, RFQStatus, TriggerType, EventType, SelectionStatus


def seed_database(drop_existing: bool = True):
    db = SessionLocal()
    try:
        if drop_existing:
            print("Resetting database tables...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        else:
            Base.metadata.create_all(bind=engine)
            buyer = db.query(User).filter(User.email == "buyer@demo.com").first()
            if buyer:
                print("Database already contains seed users. Skipping duplicate seeding.")
                return

        now = datetime.now(timezone.utc)
        print(f"Seeding fresh users and RFQs at {now.isoformat()}...")
        buyer = User(
            full_name="Acme Procurement Officer",
            email="buyer@demo.com",
            password_hash=hash_password("password123"),
            role=UserRole.BUYER.value,
            is_active=True,
            created_at=now
        )
        supplier1 = User(
            full_name="FastTrack Global Cargo",
            email="supplier1@demo.com",
            password_hash=hash_password("password123"),
            role=UserRole.SUPPLIER.value,
            is_active=True,
            created_at=now
        )
        supplier2 = User(
            full_name="Apex Freight Lines",
            email="supplier2@demo.com",
            password_hash=hash_password("password123"),
            role=UserRole.SUPPLIER.value,
            is_active=True,
            created_at=now
        )
        supplier3 = User(
            full_name="BlueDart Logistics",
            email="supplier3@demo.com",
            password_hash=hash_password("password123"),
            role=UserRole.SUPPLIER.value,
            is_active=True,
            created_at=now
        )

        db.add_all([buyer, supplier1, supplier2, supplier3])
        db.commit()
        db.refresh(buyer)
        db.refresh(supplier1)
        db.refresh(supplier2)
        db.refresh(supplier3)

        print("Seeding RFQs...")

        # RFQ 1: Active British Auction with BID_RECEIVED trigger (Closing in 8 minutes - INSIDE trigger window)
        rfq1_start = now - timedelta(hours=1)
        rfq1_close = now + timedelta(minutes=8)
        rfq1_forced = now + timedelta(hours=2)
        rfq1 = RFQ(
            reference_id="RFQ-2026-001",
            name="Trans-Pacific Container Freight (Shanghai to LA)",
            buyer_id=buyer.id,
            bid_start_at=rfq1_start,
            initial_bid_close_at=rfq1_close,
            current_bid_close_at=rfq1_close,
            forced_close_at=rfq1_forced,
            pickup_service_date=date.today() + timedelta(days=14),
            status=RFQStatus.ACTIVE.value,
            created_at=rfq1_start,
            updated_at=now
        )
        db.add(rfq1)
        db.flush()

        config1 = AuctionConfig(
            rfq_id=rfq1.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_type=TriggerType.BID_RECEIVED.value,
            created_at=rfq1_start,
            updated_at=rfq1_start
        )
        db.add(config1)

        # Quotes and Bids for RFQ 1
        quote1_s1 = Quote(
            rfq_id=rfq1.id,
            supplier_id=supplier1.id,
            carrier_name="Maersk Line",
            freight_charges=Decimal("45000.00"),
            origin_charges=Decimal("3000.00"),
            destination_charges=Decimal("2000.00"),
            transit_time="14 Days",
            validity_text="Valid 30 Days",
            currency_code="INR",
            created_at=rfq1_start + timedelta(minutes=5)
        )
        quote1_s2 = Quote(
            rfq_id=rfq1.id,
            supplier_id=supplier2.id,
            carrier_name="MSC Mediterranean",
            freight_charges=Decimal("46000.00"),
            origin_charges=Decimal("2500.00"),
            destination_charges=Decimal("2500.00"),
            transit_time="16 Days",
            validity_text="Valid 30 Days",
            currency_code="INR",
            created_at=rfq1_start + timedelta(minutes=10)
        )
        db.add_all([quote1_s1, quote1_s2])
        db.flush()

        bid1_s1_init = Bid(
            rfq_id=rfq1.id,
            quote_id=quote1_s1.id,
            supplier_id=supplier1.id,
            bid_amount=Decimal("50000.00"),
            request_id=uuid.uuid4(),
            created_at=rfq1_start + timedelta(minutes=5)
        )
        bid1_s2_init = Bid(
            rfq_id=rfq1.id,
            quote_id=quote1_s2.id,
            supplier_id=supplier2.id,
            bid_amount=Decimal("51000.00"),
            request_id=uuid.uuid4(),
            created_at=rfq1_start + timedelta(minutes=10)
        )
        bid1_s2_competitive = Bid(
            rfq_id=rfq1.id,
            quote_id=quote1_s2.id,
            supplier_id=supplier2.id,
            bid_amount=Decimal("48500.00"),
            request_id=uuid.uuid4(),
            created_at=rfq1_start + timedelta(minutes=25)
        )
        db.add_all([bid1_s1_init, bid1_s2_init, bid1_s2_competitive])

        log1 = AuctionActivityLog(
            rfq_id=rfq1.id,
            actor_user_id=buyer.id,
            event_type=EventType.RFQ_CREATED.value,
            description="RFQ created with British Auction dynamic extensions.",
            created_at=rfq1_start
        )
        log2 = AuctionActivityLog(
            rfq_id=rfq1.id,
            actor_user_id=supplier2.id,
            event_type=EventType.BID_SUBMITTED.value,
            description="Supplier Apex Freight Lines placed competitive downward bid of INR 48,500.00, becoming L1.",
            created_at=rfq1_start + timedelta(minutes=25)
        )
        db.add_all([log1, log2])

        # RFQ 2: Active British Auction with L1_RANK_CHANGE trigger
        rfq2_start = now - timedelta(hours=2)
        rfq2_close = now + timedelta(minutes=25)
        rfq2_forced = now + timedelta(hours=3)
        rfq2 = RFQ(
            reference_id="RFQ-2026-002",
            name="Air Express Electronics Cargo (Shenzhen to Delhi)",
            buyer_id=buyer.id,
            bid_start_at=rfq2_start,
            initial_bid_close_at=rfq2_close,
            current_bid_close_at=rfq2_close,
            forced_close_at=rfq2_forced,
            pickup_service_date=date.today() + timedelta(days=7),
            status=RFQStatus.ACTIVE.value,
            created_at=rfq2_start,
            updated_at=now
        )
        db.add(rfq2)
        db.flush()

        config2 = AuctionConfig(
            rfq_id=rfq2.id,
            trigger_window_minutes=15,
            extension_duration_minutes=10,
            trigger_type=TriggerType.L1_RANK_CHANGE.value,
            created_at=rfq2_start,
            updated_at=rfq2_start
        )
        db.add(config2)

        # RFQ 3: Scheduled auction
        rfq3_start = now + timedelta(hours=3)
        rfq3_close = now + timedelta(hours=7)
        rfq3_forced = now + timedelta(hours=10)
        rfq3 = RFQ(
            reference_id="RFQ-2026-003",
            name="Domestic Cold Chain Reefer Fleet (Mumbai to Bangalore)",
            buyer_id=buyer.id,
            bid_start_at=rfq3_start,
            initial_bid_close_at=rfq3_close,
            current_bid_close_at=rfq3_close,
            forced_close_at=rfq3_forced,
            pickup_service_date=date.today() + timedelta(days=20),
            status=RFQStatus.SCHEDULED.value,
            created_at=now,
            updated_at=now
        )
        db.add(rfq3)
        db.flush()

        config3 = AuctionConfig(
            rfq_id=rfq3.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_type=TriggerType.ANY_SUPPLIER_RANK_CHANGE.value,
            created_at=now,
            updated_at=now
        )
        db.add(config3)

        # RFQ 4: Successfully Closed with Awarded Winner
        rfq4_start = now - timedelta(days=2)
        rfq4_close = now - timedelta(days=1)
        rfq4_forced = now - timedelta(days=1) + timedelta(hours=2)
        rfq4 = RFQ(
            reference_id="RFQ-2026-004",
            name="Heavy Machinery Inland Transport (Chennai Port to Hyderabad)",
            buyer_id=buyer.id,
            bid_start_at=rfq4_start,
            initial_bid_close_at=rfq4_close,
            current_bid_close_at=rfq4_close,
            forced_close_at=rfq4_forced,
            pickup_service_date=date.today() + timedelta(days=10),
            status=RFQStatus.CLOSED.value,
            created_at=rfq4_start,
            updated_at=rfq4_close
        )
        db.add(rfq4)
        db.flush()

        config4 = AuctionConfig(
            rfq_id=rfq4.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_type=TriggerType.BID_RECEIVED.value,
            created_at=rfq4_start,
            updated_at=rfq4_start
        )
        db.add(config4)

        result4 = AuctionResult(
            rfq_id=rfq4.id,
            winning_supplier_id=supplier1.id,
            final_bid_amount=Decimal("38000.00"),
            selection_status=SelectionStatus.SELECTED.value,
            closed_at=rfq4_close,
            created_at=rfq4_close
        )
        db.add(result4)

        # RFQ 5: Force Closed auction
        rfq5_start = now - timedelta(days=3)
        rfq5_close = now - timedelta(days=2)
        rfq5_forced = now - timedelta(days=2) + timedelta(hours=2)
        rfq5 = RFQ(
            reference_id="RFQ-2026-005",
            name="Bulk Chemical Tanker Logistics (Gujarat to Pune)",
            buyer_id=buyer.id,
            bid_start_at=rfq5_start,
            initial_bid_close_at=rfq5_close,
            current_bid_close_at=rfq5_forced,
            forced_close_at=rfq5_forced,
            pickup_service_date=date.today() + timedelta(days=5),
            status=RFQStatus.FORCE_CLOSED.value,
            created_at=rfq5_start,
            updated_at=rfq5_forced
        )
        db.add(rfq5)
        db.flush()

        config5 = AuctionConfig(
            rfq_id=rfq5.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            trigger_type=TriggerType.BID_RECEIVED.value,
            created_at=rfq5_start,
            updated_at=rfq5_start
        )
        db.add(config5)

        result5 = AuctionResult(
            rfq_id=rfq5.id,
            winning_supplier_id=supplier2.id,
            final_bid_amount=Decimal("72000.00"),
            selection_status=SelectionStatus.PENDING_SELECTION.value,
            closed_at=rfq5_forced,
            created_at=rfq5_forced
        )
        db.add(result5)

        db.commit()
        print("Database seeding completed successfully!")
        print("Demo Accounts:")
        print("  Buyer:      buyer@demo.com / password123")
        print("  Supplier 1: supplier1@demo.com / password123")
        print("  Supplier 2: supplier2@demo.com / password123")
        print("  Supplier 3: supplier3@demo.com / password123")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
