import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

logger = logging.getLogger("auction.db")

DATABASE_URL = settings.DATABASE_URL

# Check if PostgreSQL driver is available; if not or if using sqlite, fallback cleanly
connect_args = {}
if DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        logger.warning("psycopg2 is not installed in local environment. Falling back to local SQLite database.")
        DATABASE_URL = "sqlite:///./british_auction.db"
        connect_args["check_same_thread"] = False

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True if not DATABASE_URL.startswith("sqlite") else False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
