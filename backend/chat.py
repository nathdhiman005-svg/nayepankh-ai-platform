"""
chat.py - AI Chatbot for NayePankh Foundation

This module handles the chatbot feature:
- Receives user messages
- Sends them to Groq API (Llama 3.3 70B) with NGO context
- Returns AI-generated responses
- Saves conversations to SQLite
"""

import json
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from .database import save_chat

# Create a router for chat endpoints
router = APIRouter()

# Load NGO information from JSON file to use as context
NGO_INFO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ngo_info.json")

with open(NGO_INFO_PATH, "r", encoding="utf-8") as f:
    NGO_INFO = json.load(f)

# Groq API endpoint
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# The AI model to use
MODEL_NAME = "llama-3.3-70b-versatile"

# System prompt that tells the AI how to behave
SYSTEM_PROMPT = f"""You are a friendly and helpful AI assistant for NayePankh Foundation, 
a UP Government registered NGO and one of the biggest student-led organizations in India.

Here is information about NayePankh Foundation:
- Name: {NGO_INFO['name']}
- Mission: {NGO_INFO['mission']}
- Vision: {NGO_INFO['vision']}
- Description: {NGO_INFO['description']}
- Registration: {NGO_INFO['registration']}
- Founder: {NGO_INFO['founder']['name']}, {NGO_INFO['founder']['title']}
- Founder's Quote: "{NGO_INFO['founder']['quote']}"
- Contact Email: {NGO_INFO['contact']['email']}
- Phone: {NGO_INFO['contact']['phone']}
- Website: {NGO_INFO['contact']['website']}
- Donate: {NGO_INFO['contact']['donate_url']}
- Tax Info: {NGO_INFO['tax_info']}

Initiatives:
{json.dumps(NGO_INFO['initiatives'], indent=2)}

Volunteer Roles:
{json.dumps(NGO_INFO['volunteer_roles'], indent=2)}

Impact Statistics:
- Volunteers: {NGO_INFO['impact']['volunteers']}+
- Campaigns: {NGO_INFO['impact']['campaigns']}+
- Beneficiaries: {NGO_INFO['impact']['beneficiaries']}+
- Events: {NGO_INFO['impact']['events']}+

Guidelines:
1. Always be warm, encouraging, and professional
2. Provide accurate information about NayePankh Foundation
3. Encourage visitors to volunteer or donate
4. Keep responses concise but informative (2-3 paragraphs max)
5. If asked about something unrelated to NayePankh, politely redirect the conversation
6. Use emojis occasionally to be friendly
"""


# Request model - defines what data the API expects
class ChatRequest(BaseModel):
    message: str  # The user's message


# Response model - defines what data the API returns
class ChatResponse(BaseModel):
    response: str  # The AI's response


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint - receives a user message and returns an AI response.
    
    How it works:
    1. Takes the user's message
    2. Sends it to Groq API with the NGO context (system prompt)
    3. Gets the AI response
    4. Saves the conversation to SQLite
    5. Returns the response
    """
    try:
        # Prepare the request for Groq
        groq_request = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
            ],
            "stream": False
        }

        # Setup headers with API key
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        # Send request to Groq
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GROQ_URL, json=groq_request, headers=headers)

        # Check if the request was successful
        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", "Failed to get response from Groq.")
            raise HTTPException(
                status_code=500,
                detail=f"Groq API Error: {error_detail}"
            )

        # Extract the AI's response
        response_data = response.json()
        if "choices" in response_data and len(response_data["choices"]) > 0:
            ai_response = response_data["choices"][0]["message"]["content"]
        else:
            ai_response = "I'm sorry, I couldn't generate a response."

        # Save the conversation to the database
        save_chat(request.message, ai_response)

        return ChatResponse(response=ai_response)

    except HTTPException:
        # Re-raise HTTPExceptions (including from ConnectError handling)
        raise
    except httpx.ConnectError:
        # This happens when there's a network issue
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Groq API. Please check your internet connection."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )
