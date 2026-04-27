from app.core.config import settings

async def send_verification_email(email: str, token: str) -> None:
    """Send verification email to user."""
    # This is a placeholder - implement actual email sending
    print(f"Sending verification email to {email} with token {token}")
    # In production, integrate with email service like SendGrid, AWS SES, etc.