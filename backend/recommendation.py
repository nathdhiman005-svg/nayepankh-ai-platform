"""
recommendation.py - Personalized Volunteer Recommendation Engine

This module handles the volunteer recommendation feature:
- Receives user profile data (name, interests, skills, available time)
- Uses Groq API (Llama 3.3 70B) to generate personalized volunteer recommendations
- Returns recommended role, suggested activities, and contribution ideas
- Saves recommendations to SQLite
"""

import json
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from .database import save_recommendation

# Create a router for recommendation endpoints
router = APIRouter()

# Load NGO information for context
NGO_INFO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ngo_info.json")

with open(NGO_INFO_PATH, "r", encoding="utf-8") as f:
    NGO_INFO = json.load(f)

# Groq API settings
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"


# Request model - the user's profile information
class RecommendationRequest(BaseModel):
    name: str             # User's name
    interests: str        # What they're interested in (e.g., "education, environment")
    skills: str           # Their skills (e.g., "teaching, public speaking")
    available_time: str   # How much time they can give (e.g., "5 hours per week")


# Response model
class RecommendationResponse(BaseModel):
    recommendation: str   # The AI-generated recommendation


@router.post("/api/recommend", response_model=RecommendationResponse)
async def recommend(request: RecommendationRequest):
    """
    Volunteer Recommendation endpoint.
    
    How it works:
    1. Takes user's profile (name, interests, skills, time)
    2. Creates a prompt with their info + available volunteer roles
    3. Sends to Groq API to generate personalized recommendations
    4. Saves to database and returns the result
    """
    try:
        # Dynamically load API key so changes to .env take effect immediately
        load_dotenv(override=True)
        api_key = os.getenv("GROQ_API_KEY")

        # Check if API key is valid or missing
        if not api_key or api_key == "your_actual_key_here":
            mock_recommendation = f"🤖 **Mock Mode Active!**\n\nHi {request.name}! I noticed the Groq API key isn't configured yet.\n\nOnce you add your API key to the `.env` file, I'll analyze your interest in **{request.interests}** and your skills in **{request.skills}** to provide a customized volunteer recommendation.\n\n**Recommended Role**: [Mock] Community Outreach\n\n**Why This Role Suits You**: This is a placeholder response for testing the UI.\n\n**Getting Started**: Update the `GROQ_API_KEY` in your `.env` file to see real AI recommendations!"
            save_recommendation(request.name, request.interests, request.skills, request.available_time, mock_recommendation)
            return RecommendationResponse(recommendation=mock_recommendation)

        # Build the prompt with user info and available roles
        prompt = f"""Based on the following volunteer profile, provide a personalized volunteer recommendation for NayePankh Foundation.

VOLUNTEER PROFILE:
- Name: {request.name}
- Interests: {request.interests}
- Skills: {request.skills}
- Available Time: {request.available_time}

AVAILABLE VOLUNTEER ROLES AT NAYEPANKH FOUNDATION:
{json.dumps(NGO_INFO['volunteer_roles'], indent=2)}

NAYEPANKH INITIATIVES:
{json.dumps(NGO_INFO['initiatives'], indent=2)}

Please provide a personalized recommendation with the following format:

**Recommended Role**: [Best matching role]

**Why This Role Suits You**: [2-3 sentences explaining the match]

**Suggested Activities**:
- [Activity 1]
- [Activity 2]  
- [Activity 3]

**Personalized Contribution Ideas**:
- [Idea 1 based on their specific skills]
- [Idea 2 based on their interests]
- [Idea 3 based on their available time]

**Getting Started**: [Brief next steps to join]

Keep the tone warm, encouraging, and professional. Make {request.name} feel valued and excited to contribute!"""

        # System prompt for the recommendation AI
        system_prompt = """You are a volunteer coordinator AI for NayePankh Foundation, 
a leading student-led NGO in India. Your job is to match volunteers with the perfect 
role based on their interests, skills, and availability. Be warm, encouraging, 
and specific in your recommendations. Use the markdown formatting as specified."""

        # Send request to Groq
        groq_request = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GROQ_URL, json=groq_request, headers=headers)

        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", "Failed to get recommendation from Groq.")
            raise HTTPException(
                status_code=500,
                detail=f"Groq API Error: {error_detail}"
            )

        # Extract the recommendation
        response_data = response.json()
        if "choices" in response_data and len(response_data["choices"]) > 0:
            recommendation_text = response_data["choices"][0]["message"]["content"]
        else:
            recommendation_text = "Unable to generate recommendation."

        # Save to database
        save_recommendation(
            name=request.name,
            interests=request.interests,
            skills=request.skills,
            available_time=request.available_time,
            recommendation=recommendation_text
        )

        return RecommendationResponse(recommendation=recommendation_text)

    except HTTPException:
        # Re-raise HTTPExceptions so they don't get caught by the generic handler
        raise
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Groq API. Please check your internet connection."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )
