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
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import our route modules
from .chat import router as chat_router
from .recommendation import router as recommendation_router
from .content_generator import router as content_generator_router
from .admin import router as admin_router
from .messaging import router as messaging_router
from .database import init_database, create_user, save_volunteer_application, save_contact_query
from .auth import get_password_hash

# ============================================================
# Load NGO info for the info endpoint
# ============================================================
NGO_INFO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ngo_info.json")

with open(NGO_INFO_PATH, "r", encoding="utf-8") as f:
    NGO_INFO = json.load(f)


# ============================================================
# Lifespan - runs on startup and shutdown
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database when the server starts."""
    init_database()
    
    # Create default head admin if it doesn't exist
    hashed_head = get_password_hash("admin123")
    create_user("head_admin", hashed_head, "Head Administrator", "head")
    
    # Create dummy manager for testing
    hashed_manager = get_password_hash("manager123")
    create_user("manager_dummy", hashed_manager, "Test Manager", "manager")
    
    # Create dummy staff for testing
    hashed_staff = get_password_hash("staff123")
    create_user("staff_dummy", hashed_staff, "Test Staff", "staff")
    
    print("[OK] NayePankh AI Assistant Backend is running!")
    print("[INFO] API docs available at: http://localhost:8000/docs")
    yield
    # Shutdown logic (if any) goes here
    print("[INFO] Server shutting down...")


# ============================================================
# Create the FastAPI application
# ============================================================
app = FastAPI(
    title="NayePankh AI Assistant",
    description="AI-powered assistant for NayePankh Foundation - helping visitors learn about the NGO, volunteering, and social initiatives.",
    version="1.0.0",
    lifespan=lifespan
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
app.include_router(admin_router)              # /api/auth/*, /api/staff/*, /api/manager/*, /api/head/*
app.include_router(messaging_router)          # /api/messaging/*


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


# Request model for volunteer application
class VolunteerApplicationRequest(BaseModel):
    name: str
    email: str
    phone: str
    role: str


@app.post("/api/volunteer-apply")
async def volunteer_apply(request: VolunteerApplicationRequest):
    """
    Volunteer Application endpoint.
    Receives applicant details and saves them to the database.
    """
    save_volunteer_application(
        name=request.name,
        email=request.email,
        phone=request.phone,
        role=request.role
    )
    return {
        "status": "success",
        "message": f"Thank you {request.name}! Your volunteer application has been received."
    }

class ContactQueryRequest(BaseModel):
    name: str
    email: str
    subject: str = ""
    message: str

@app.post("/api/contact")
async def contact_us(request: ContactQueryRequest):
    """
    Contact Us endpoint.
    Receives contact queries and saves them to the database.
    """
    save_contact_query(
        name=request.name,
        email=request.email,
        subject=request.subject,
        message=request.message
    )
    return {
        "status": "success",
        "message": "Thank you for reaching out! Your message has been saved."
    }
