from typing import Optional
from app.models.letter import LetterType
from app.schemas.letter import LetterGenerateRequest
from app.crud.resume import get_resume
from sqlalchemy.ext.asyncio import AsyncSession
import openai
from app.core.config import settings

class LetterGenerationService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_letter(
        self,
        db: AsyncSession,
        request: LetterGenerateRequest,
        user_id: int
    ) -> dict:
        # Get resume content if provided
        resume_content = ""
        if request.resume_id:
            resume = await get_resume(db, request.resume_id, user_id)
            if resume:
                resume_content = resume.extracted_text or ""

        # Create the prompt based on letter type
        prompt = self._create_prompt(request, resume_content)

        # Generate letter content using OpenAI
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a professional career counselor and letter writer. Generate high-quality, professional letters."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )

            content = response.choices[0].message.content.strip()

            # Create title
            title = self._create_title(request)

            return {
                "title": title,
                "content": content,
                "recipient": request.recipient_name or f"Hiring Manager at {request.company_name}",
                "letter_type": request.letter_type,
                "job_title": request.job_title,
                "company_name": request.company_name,
                "resume_id": request.resume_id
            }

        except Exception as e:
            raise Exception(f"Failed to generate letter: {str(e)}")

    def _create_prompt(self, request: LetterGenerateRequest, resume_content: str) -> str:
        base_prompts = {
            LetterType.cover_letter: f"""
Write a professional cover letter for the position of {request.job_title} at {request.company_name}.

{'Resume information: ' + resume_content if resume_content else 'No resume provided.'}

{'Custom instructions: ' + request.custom_instructions if request.custom_instructions else ''}

The cover letter should:
- Introduce the candidate and express interest in the position
- Highlight relevant skills and experience
- Explain why the candidate is a good fit for the company
- Include a call to action
- Be professional, concise, and compelling
""",
            LetterType.thank_you_letter: f"""
Write a professional thank you letter following an interview for the {request.job_title} position at {request.company_name}.

{'Resume information: ' + resume_content if resume_content else 'No resume provided.'}

{'Custom instructions: ' + request.custom_instructions if request.custom_instructions else ''}

The thank you letter should:
- Express gratitude for the interview opportunity
- Reiterate interest in the position
- Highlight key discussion points or qualifications
- Include a professional closing
""",
            LetterType.follow_up_letter: f"""
Write a professional follow-up letter regarding the {request.job_title} position at {request.company_name}.

{'Resume information: ' + resume_content if resume_content else 'No resume provided.'}

{'Custom instructions: ' + request.custom_instructions if request.custom_instructions else ''}

The follow-up letter should:
- Reference previous communication
- Reiterate interest in the position
- Provide any additional relevant information
- Include a call to action
""",
            LetterType.custom_letter: f"""
Write a professional letter for {request.job_title} at {request.company_name}.

{'Resume information: ' + resume_content if resume_content else 'No resume provided.'}

{'Custom instructions: ' + request.custom_instructions if request.custom_instructions else ''}

Ensure the letter is professional and appropriate for the business context.
"""
        }

        return base_prompts.get(request.letter_type, base_prompts[LetterType.custom_letter])

    def _create_title(self, request: LetterGenerateRequest) -> str:
        type_labels = {
            LetterType.cover_letter: "Cover Letter",
            LetterType.thank_you_letter: "Thank You Letter",
            LetterType.follow_up_letter: "Follow Up Letter",
            LetterType.custom_letter: "Custom Letter"
        }

        label = type_labels.get(request.letter_type, "Letter")
        return f"{label} - {request.job_title} at {request.company_name}"