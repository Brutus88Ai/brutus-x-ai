# backend/app/models.py
# SQLAlchemy ORM models for User and Job

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.sql import func
from .db import Base
import enum

class SubscriptionStatus(str, enum.Enum):
    free = "free"
    trial = "trial"
    paid = "paid"
    cancelled = "cancelled"

class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    subscription = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.free)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    script_id = Column(String, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.queued, index=True)
    metadata = Column(JSON, nullable=True)  # arbitrary payload (prompts, settings)
    result_url = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Self-check note:
# After creating tables run:
#   from app.db import engine
#   from app.models import Base
#   Base.metadata.create_all(bind=engine)
# Then verify `users` and `jobs` appear in your Postgres DB.
