from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import sqlite3

from .auth import get_current_user, require_role
from .database import (
    get_connection,
    get_or_create_conversation,
    get_user_conversations,
    get_conversation_messages,
    add_message,
    mark_conversation_read,
    delete_message,
    get_conversation_by_id
)

router = APIRouter()

# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    "head": 3,
    "manager": 2,
    "staff": 1
}

def can_contact(sender_role: str, receiver_role: str) -> bool:
    """
    Returns True if sender_role is allowed to send a message to receiver_role.
    Rule: A user cannot send a message to someone with a higher hierarchy role.
    """
    return ROLE_HIERARCHY.get(sender_role, 0) >= ROLE_HIERARCHY.get(receiver_role, 0)

@router.get("/api/messaging/users/search")
async def search_users(q: str = "", current_user: dict = Depends(get_current_user)):
    """
    Search for users to start a conversation.
    Filters out users that the current_user is not allowed to contact.
    """
    if not q:
        return []
        
    conn = get_connection()
    cursor = conn.cursor()
    # Search by username or full_name, excluding self
    query = "SELECT id, username, full_name, role FROM users WHERE (username LIKE ? OR full_name LIKE ?) AND id != ?"
    search_term = f"%{q}%"
    cursor.execute(query, (search_term, search_term, current_user['id']))
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Filter by hierarchy
    allowed_users = [u for u in users if can_contact(current_user['role'], u['role'])]
    return allowed_users

@router.get("/api/messaging/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for the current user."""
    return get_user_conversations(current_user['id'])

class MessageSendRequest(BaseModel):
    receiver_id: int
    content: str

@router.post("/api/messaging/conversations")
async def send_message(request: MessageSendRequest, current_user: dict = Depends(get_current_user)):
    """
    Send a message to a user. This will create a conversation if one doesn't exist.
    """
    if request.receiver_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
        
    # Check receiver role
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (request.receiver_id,))
    receiver = cursor.fetchone()
    conn.close()
    
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
        
    if not can_contact(current_user['role'], receiver['role']):
        raise HTTPException(status_code=403, detail="You do not have permission to message this user")
        
    # Get or create conversation
    conv_id = get_or_create_conversation(current_user['id'], request.receiver_id)
    
    # Add message
    msg_id = add_message(conv_id, current_user['id'], request.content)
    return {"message": "Message sent successfully", "conversation_id": conv_id, "message_id": msg_id}

@router.get("/api/messaging/conversations/{conv_id}/messages")
async def get_messages(conv_id: int, current_user: dict = Depends(get_current_user)):
    """Get all messages in a conversation, and mark unread messages as read."""
    conv = get_conversation_by_id(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if current_user['id'] not in (conv['user1_id'], conv['user2_id']):
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Mark as read
    mark_conversation_read(conv_id, current_user['id'])
    
    return get_conversation_messages(conv_id)

class MessageReplyRequest(BaseModel):
    content: str

@router.post("/api/messaging/conversations/{conv_id}/messages")
async def reply_message(conv_id: int, request: MessageReplyRequest, current_user: dict = Depends(get_current_user)):
    """Send a message within an existing conversation."""
    conv = get_conversation_by_id(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if current_user['id'] not in (conv['user1_id'], conv['user2_id']):
        raise HTTPException(status_code=403, detail="Access denied")
        
    other_user_id = conv['user2_id'] if conv['user1_id'] == current_user['id'] else conv['user1_id']
    
    # Check receiver role
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (other_user_id,))
    receiver = cursor.fetchone()
    conn.close()
    
    if not can_contact(current_user['role'], receiver['role']):
        raise HTTPException(status_code=403, detail="You do not have permission to reply to this user")
        
    msg_id = add_message(conv_id, current_user['id'], request.content)
    return {"message": "Message sent", "message_id": msg_id}

@router.delete("/api/messaging/messages/{message_id}")
async def delete_my_message(message_id: int, current_user: dict = Depends(get_current_user)):
    """Soft delete a message sent by the current user."""
    success = delete_message(message_id, current_user['id'])
    if not success:
        raise HTTPException(status_code=400, detail="Message not found or you are not the sender")
    return {"message": "Message deleted"}
