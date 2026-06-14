"""
content_generator.py - AI Campaign Content Generator

This module handles the campaign content generation feature:
- Receives a campaign topic (e.g., "Tree Plantation Drive")
- Uses Ollama (Llama 3.3) to generate marketing content
- Returns social media caption, awareness message, and volunteer recruitment text
- Saves generated content to SQLite
"""

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .database import save_generated_content

# Create a router for content generation endpoints
router = APIRouter()

# Ollama API settings
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.3"


# Request model
class ContentRequest(BaseModel):
    campaign_topic: str  # e.g., "Tree Plantation Drive" or "Food Donation Campaign"


# Response model
class ContentResponse(BaseModel):
    content: str  # The generated content


@router.post("/api/generate-content", response_model=ContentResponse)
async def generate_content(request: ContentRequest):
    """
    Campaign Content Generator endpoint.
    
    How it works:
    1. Takes a campaign topic from the user
    2. Asks Ollama to generate three types of content
    3. Returns the generated content
    4. Saves everything to the database
    """
    try:
        # Build the content generation prompt
        prompt = f"""Generate compelling campaign content for NayePankh Foundation's campaign: "{request.campaign_topic}"

NayePankh Foundation is a UP Government registered, student-led NGO in India that works for education, health awareness, women empowerment, food distribution, and environmental causes.

Please generate the following three pieces of content:

📱 **Social Media Caption**:
Write an engaging Instagram/Twitter caption (150-200 words) with relevant hashtags. Make it inspiring and include a call-to-action. Include emojis.

📢 **Awareness Message**:
Write a WhatsApp/email awareness message (150-200 words) that educates people about the importance of this campaign. Include facts and emotional appeal.

🤝 **Volunteer Recruitment Text**:
Write a volunteer recruitment message (150-200 words) encouraging people to join this campaign. Highlight the impact they can make and how to sign up.

Make all content professional, inspiring, and aligned with NayePankh Foundation's mission of uplifting underprivileged communities. Use appropriate emojis and formatting."""

        # System prompt for content generation
        system_prompt = """You are a creative content writer for NayePankh Foundation, 
a leading NGO in India. Generate professional, inspiring, and engaging campaign content 
that motivates people to participate and contribute. Use the exact format headings 
as specified (Social Media Caption, Awareness Message, Volunteer Recruitment Text) 
with the emoji prefixes."""

        # Send request to Ollama
        ollama_request = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=ollama_request)

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate content from AI model."
            )

        # Extract generated content
        generated_text = response.json().get("response", "Unable to generate content.")

        # Save to database
        save_generated_content(request.campaign_topic, generated_text)

        return ContentResponse(content=generated_text)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Please make sure Ollama is running."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )
