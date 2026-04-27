from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.crud.letter import get_letters_by_user, get_letter, create_letter, update_letter, delete_letter
from app.schemas.letter import Letter, LetterCreate, LetterUpdate, LetterGenerateRequest
from app.routers.deps import get_current_user
from app.models.user import User
from app.services.letter_generation import LetterGenerationService

router = APIRouter(prefix="/api/letters", tags=["letters"])

@router.get("/", response_model=List[Letter])
async def list_letters(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all letters for the current user."""
    return await get_letters_by_user(db, current_user.id)

@router.get("/{letter_id}", response_model=Letter)
async def get_letter_detail(
    letter_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific letter by ID."""
    letter = await get_letter(db, letter_id, current_user.id)
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    return letter

@router.post("/", response_model=Letter)
async def create_letter_endpoint(
    letter: LetterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new letter."""
    # Check subscription for letter generation
    if current_user.subscription_plan != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Letter creation requires a Pro subscription"
        )

    return await create_letter(db, letter, current_user.id)

@router.post("/generate", response_model=Letter)
async def generate_letter(
    request: LetterGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a custom letter using AI."""
    # Check subscription
    if current_user.subscription_plan != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom letter generation requires a Pro subscription"
        )

    service = LetterGenerationService()
    letter_data = await service.generate_letter(db, request, current_user.id)

    # Create the letter in database
    letter_create = LetterCreate(**letter_data)
    return await create_letter(db, letter_create, current_user.id)

@router.patch("/{letter_id}", response_model=Letter)
async def update_letter_endpoint(
    letter_id: int,
    letter_update: LetterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a letter."""
    letter = await update_letter(db, letter_id, current_user.id, letter_update)
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found")
    return letter

@router.delete("/{letter_id}")
async def delete_letter_endpoint(
    letter_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a letter."""
    success = await delete_letter(db, letter_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Letter not found")
    return {"message": "Letter deleted successfully"}