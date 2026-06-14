"""
main.py - FastAPI Application for NayePankh AI Assistant

This is the main entry point for the backend server.
It sets up:
- FastAPI application
- CORS (Cross-Origin Resource Sharing) for frontend communication
- API routes for chat, recommendations, and content generation
- Database initialization on startup
- Health check and NGO info endpoints

To run the server:
    uvicorn backend.main:app --reload --port 8000
"""

import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import our route modules
from .chat import router as chat_router
from .recommendation import router as recommendation_router
from .content_generator import router as content_generator_router
from .database import init_database

# ============================================================
# Create the FastAPI application
# ============================================================
app = FastAPI(
    title="NayePankh AI Assistant",
    description="AI-powered assistant for NayePankh Foundation - helping visitors learn about the NGO, volunteering, and social initiatives.",
    version="1.0.0"
)

# ============================================================
# Setup CORS (allows frontend to talk to backend)
# ============================================================
# This is needed because the frontend (HTML file) and backend (FastAPI)
# run on different ports/origins during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Allow all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],       # Allow all HTTP methods
    allow_headers=["*"],       # Allow all headers
)

# ============================================================
# Include API routers
# ============================================================
# Each router handles a specific AI feature
app.include_router(chat_router)               # /api/chat
app.include_router(recommendation_router)     # /api/recommend
app.include_router(content_generator_router)  # /api/generate-content

# ============================================================
# Load NGO info for the info endpoint
# ============================================================
NGO_INFO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ngo_info.json")

with open(NGO_INFO_PATH, "r", encoding="utf-8") as f:
    NGO_INFO = json.load(f)


# ============================================================
# Startup event - initialize the database
# ============================================================
@app.on_event("startup")
async def startup():
    """Initialize the database when the server starts."""
    init_database()
    print("[OK] NayePankh AI Assistant Backend is running!")
    print("[INFO] API docs available at: http://localhost:8000/docs")


# ============================================================
# API Endpoints
# ============================================================

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    Returns a simple status to verify the server is running.
    """
    return {
        "status": "healthy",
        "message": "NayePankh AI Assistant is running!"
    }


@app.get("/api/ngo-info")
async def get_ngo_info():
    """
    Returns NGO information.
    The frontend uses this to populate the webpage dynamically.
    """
    return NGO_INFO
