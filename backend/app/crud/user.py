from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash
import secrets
from datetime import datetime, timedelta, timezone

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: UserCreate) -> User:
    hashed_password = get_password_hash(user.password)
    verification_token = secrets.token_urlsafe(32)
    verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)

    db_user = User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        verification_token=verification_token,
        verification_token_expires=verification_token_expires
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def verify_user_email(db: AsyncSession, user: User) -> None:
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    await db.commit()

async def regenerate_verification_token(db: AsyncSession, user: User) -> User:
    verification_token = secrets.token_urlsafe(32)
    verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    user.verification_token = verification_token
    user.verification_token_expires = verification_token_expires
    await db.commit()
    await db.refresh(user)
    return user

async def get_or_create_google_user(db: AsyncSession, email: str, name: str, google_id: str) -> User:
    # Try to find existing user by email
    user = await get_user_by_email(db, email)
    if user:
        # Update Google ID if not set
        if not user.google_id:
            user.google_id = google_id
            if not user.name:
                user.name = name
            await db.commit()
        return user

    # Create new user
    db_user = User(
        email=email,
        name=name,
        google_id=google_id,
        is_verified=True,  # Google users are pre-verified
        is_active=True
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user