from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255))
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    subscription_plan = Column(String(50), default="free")
    subscription_status = Column(String(50), default="active")
    bio = Column(Text)
    career_preferences = Column(JSON)
    verification_token = Column(String(255), unique=True, index=True)
    verification_token_expires = Column(DateTime(timezone=True))
    google_id = Column(String(255), unique=True, index=True)

    # Relationships
    resumes = relationship("Resume", back_populates="user")
    letters = relationship("Letter", back_populates="user")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())