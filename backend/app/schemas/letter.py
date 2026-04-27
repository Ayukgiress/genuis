from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.letter import LetterType

class LetterBase(BaseModel):
    title: str
    recipient: Optional[str] = None
    content: str
    letter_type: LetterType
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    resume_id: Optional[int] = None

class LetterCreate(BaseModel):
    title: str
    recipient: Optional[str] = None
    content: str
    letter_type: LetterType
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    resume_id: Optional[int] = None

class LetterUpdate(BaseModel):
    title: Optional[str] = None
    recipient: Optional[str] = None
    content: Optional[str] = None
    letter_type: Optional[LetterType] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    resume_id: Optional[int] = None

class LetterGenerateRequest(BaseModel):
    job_title: str
    company_name: str
    recipient_name: Optional[str] = None
    resume_id: Optional[int] = None
    letter_type: LetterType
    custom_instructions: Optional[str] = None

class Letter(LetterBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True