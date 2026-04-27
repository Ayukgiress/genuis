from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    bio: Optional[str] = None
    career_preferences: Optional[dict] = None
    subscription_plan: Optional[str] = "free"
    subscription_status: Optional[str] = "active"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreateResponse(BaseModel):
    message: str
    user: User

class VerificationResponse(BaseModel):
    message: str