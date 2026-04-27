from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from app.models.letter import Letter
from app.schemas.letter import LetterCreate, LetterUpdate

async def get_letters_by_user(db: AsyncSession, user_id: int) -> List[Letter]:
    result = await db.execute(
        select(Letter).where(Letter.user_id == user_id).order_by(Letter.created_at.desc())
    )
    return result.scalars().all()

async def get_letter(db: AsyncSession, letter_id: int, user_id: int) -> Optional[Letter]:
    result = await db.execute(
        select(Letter).where(Letter.id == letter_id, Letter.user_id == user_id)
    )
    return result.scalar_one_or_none()

async def create_letter(db: AsyncSession, letter: LetterCreate, user_id: int) -> Letter:
    db_letter = Letter(**letter.model_dump(), user_id=user_id)
    db.add(db_letter)
    await db.commit()
    await db.refresh(db_letter)
    return db_letter

async def update_letter(db: AsyncSession, letter_id: int, user_id: int, letter_update: LetterUpdate) -> Optional[Letter]:
    result = await db.execute(
        select(Letter).where(Letter.id == letter_id, Letter.user_id == user_id)
    )
    db_letter = result.scalar_one_or_none()
    if not db_letter:
        return None

    for field, value in letter_update.model_dump(exclude_unset=True).items():
        setattr(db_letter, field, value)

    await db.commit()
    await db.refresh(db_letter)
    return db_letter

async def delete_letter(db: AsyncSession, letter_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(Letter).where(Letter.id == letter_id, Letter.user_id == user_id)
    )
    db_letter = result.scalar_one_or_none()
    if not db_letter:
        return False

    await db.delete(db_letter)
    await db.commit()
    return True