from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import router as auth_router
from app.routers.letters import router as letters_router

app = FastAPI(title="Genuis API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(letters_router)

@app.get("/")
async def root():
    return {"message": "Genuis API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}