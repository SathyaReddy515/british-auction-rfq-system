import pytest
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.db.session import Base, get_db
from backend.app.main import app
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.user import User
from backend.app.models.rfq import RFQ
from backend.app.models.auction_config import AuctionConfig
from backend.app.models.quote import Quote
from backend.app.models.bid import Bid
from backend.app.models.enums import UserRole, RFQStatus, TriggerType

# Use an isolated SQLite in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def buyer_user(db_session):
    user = User(
        full_name="Test Buyer",
        email="buyer@test.com",
        password_hash=hash_password("password123"),
        role=UserRole.BUYER.value,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def supplier_user(db_session):
    user = User(
        full_name="Supplier One",
        email="supplier1@test.com",
        password_hash=hash_password("password123"),
        role=UserRole.SUPPLIER.value,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def supplier_user_2(db_session):
    user = User(
        full_name="Supplier Two",
        email="supplier2@test.com",
        password_hash=hash_password("password123"),
        role=UserRole.SUPPLIER.value,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def buyer_headers(buyer_user):
    token = create_access_token(subject=buyer_user.id, role=buyer_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def supplier_headers(supplier_user):
    token = create_access_token(subject=supplier_user.id, role=supplier_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def supplier_headers_2(supplier_user_2):
    token = create_access_token(subject=supplier_user_2.id, role=supplier_user_2.role)
    return {"Authorization": f"Bearer {token}"}
