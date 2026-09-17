import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
# Load .env from the same directory as this file (backend/)
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'campustrack.db'}")
if DATABASE_URL.startswith("sqlite:///./"):
    rel_path = DATABASE_URL[len("sqlite:///./"):]
    DATABASE_URL = f"sqlite:///{BASE_DIR / rel_path}"

# Connect args specific to SQLite (not needed/supported for Postgres)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
