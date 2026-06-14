"""
chat.py - AI Chatbot for NayePankh Foundation

This module handles the chatbot feature:
- Receives user messages
- Sends them to Ollama (Llama 3.3) with NGO context
- Returns AI-generated responses
- Saves conversations to SQLite
"""

import json
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .database import save_chat

# Create a router for chat endpoints
router = APIRouter()

# Load NGO information from JSON file to use as context
NGO_INFO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ngo_info.json")

with open(NGO_INFO_PATH, "r", encoding="utf-8") as f:
    NGO_INFO = json.load(f)

# Ollama API endpoint (default local address)
OLLAMA_URL = "http://localhost:11434/api/generate"

# The AI model to use
MODEL_NAME = "llama3.2"

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
    2. Sends it to Ollama with the NGO context (system prompt)
    3. Gets the AI response
    4. Saves the conversation to SQLite
    5. Returns the response
    """
    try:
        # Prepare the request for Ollama
        ollama_request = {
            "model": MODEL_NAME,
            "prompt": request.message,
            "system": SYSTEM_PROMPT,
            "stream": False  # We want the complete response at once
        }

        # Send request to Ollama (with a generous timeout for AI generation)
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=ollama_request)

        # Check if the request was successful
        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail="Failed to get response from AI model. Make sure Ollama is running."
            )

        # Extract the AI's response
        ai_response = response.json().get("response", "I'm sorry, I couldn't generate a response.")

        # Save the conversation to the database
        save_chat(request.message, ai_response)

        return ChatResponse(response=ai_response)

    except HTTPException:
        # Re-raise HTTPExceptions (including from ConnectError handling)
        raise
    except httpx.ConnectError:
        # This happens when Ollama is not running
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Please make sure Ollama is running (run 'ollama serve' in terminal)."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )
