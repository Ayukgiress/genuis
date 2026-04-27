# Genuis Backend API

FastAPI backend for the Genuis job application platform.

## Features

- User authentication and registration
- Google OAuth integration
- Email verification
- AI-powered letter generation
- Resume management
- Subscription management

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
Copy `.env` and update the values:
```bash
cp .env .env.local
# Edit .env.local with your actual values
```

3. Set up the database:
```bash
# Make sure PostgreSQL is running
python create_db.py
```

4. Run the server:
```bash
python run.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/token` - Login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback

### Letters
- `GET /api/letters/` - List user letters
- `POST /api/letters/` - Create letter
- `POST /api/letters/generate` - Generate AI letter
- `GET /api/letters/{id}` - Get letter
- `PATCH /api/letters/{id}` - Update letter
- `DELETE /api/letters/{id}` - Delete letter

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `OPENAI_API_KEY` - OpenAI API key for letter generation