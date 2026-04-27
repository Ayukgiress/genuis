from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class LetterType(str, enum.Enum):
    cover_letter = "cover_letter"
    thank_you_letter = "thank_you_letter"
    follow_up_letter = "follow_up_letter"
    custom_letter = "custom_letter"

class Letter(Base):
    __tablename__ = "letters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    recipient = Column(String(255))
    content = Column(Text, nullable=False)
    letter_type = Column(Enum(LetterType), nullable=False)
    job_title = Column(String(255))
    company_name = Column(String(255))
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="letters")
    resume = relationship("Resume", back_populates="letters")