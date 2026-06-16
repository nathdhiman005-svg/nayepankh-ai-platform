"""
database.py - SQLite Database Setup for NayePankh AI Assistant

This module handles all database operations:
- Creating tables for users, events, recommendations, generated content, and chat history
- Inserting and retrieving records
"""

import sqlite3
import os
from datetime import datetime

# Database file path (stored in project root)
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "nayepankh.db")


def get_connection():
    """Create and return a database connection."""
    conn = sqlite3.connect(DB_PATH)
    # Enable dictionary-like access to rows
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize the database by creating all required tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Chat History
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_message TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # 2. Volunteer Recommendations (Public applications)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            interests TEXT NOT NULL,
            skills TEXT NOT NULL,
            available_time TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # 3. Generated Content
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS generated_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_topic TEXT NOT NULL,
            generated_text TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # 4. Users (Staff, Managers, Head)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL, -- 'staff', 'manager', 'head'
            created_at TEXT NOT NULL
        )
    """)

    # 5. Events
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            event_date TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    """)

    # 6. Event Attendance (Mapping staff to events)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS event_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            staff_id INTEGER NOT NULL,
            status TEXT NOT NULL, -- 'registered', 'attended'
            timestamp TEXT NOT NULL,
            FOREIGN KEY (event_id) REFERENCES events (id),
            FOREIGN KEY (staff_id) REFERENCES users (id),
            UNIQUE(event_id, staff_id)
        )
    """)

    # 7. Volunteer Applications (Public applications from the website)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS volunteer_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
            timestamp TEXT NOT NULL
        )
    """)

    # 8. Staff Removal Requests
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS staff_removal_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id INTEGER NOT NULL,
            requested_by INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
            timestamp TEXT NOT NULL,
            FOREIGN KEY (staff_id) REFERENCES users (id),
            FOREIGN KEY (requested_by) REFERENCES users (id)
        )
    """)

    # 9. Conversations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user1_id) REFERENCES users (id),
            FOREIGN KEY (user2_id) REFERENCES users (id),
            UNIQUE(user1_id, user2_id)
        )
    """)

    # 10. Messages
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id),
            FOREIGN KEY (sender_id) REFERENCES users (id)
        )
    """)

    # 11. Contact Queries
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contact_queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'unread',
            timestamp TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] Database initialized successfully!")


# ==========================================
# PUBLIC API HELPERS
# ==========================================

def save_chat(user_message: str, ai_response: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (user_message, ai_response, timestamp) VALUES (?, ?, ?)",
        (user_message, ai_response, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def save_contact_query(name: str, email: str, subject: str, message: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO contact_queries (name, email, subject, message, status, timestamp) VALUES (?, ?, ?, ?, 'unread', ?)",
        (name, email, subject, message, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def save_recommendation(name: str, interests: str, skills: str, available_time: str, recommendation: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO recommendations (name, interests, skills, available_time, recommendation, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (name, interests, skills, available_time, recommendation, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def save_generated_content(campaign_topic: str, generated_text: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO generated_content (campaign_topic, generated_text, timestamp) VALUES (?, ?, ?)",
        (campaign_topic, generated_text, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def save_volunteer_application(name: str, email: str, phone: str, role: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO volunteer_applications (name, email, phone, role, status, timestamp) VALUES (?, ?, ?, ?, 'pending', ?)",
        (name, email, phone, role, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_volunteer_applications(limit: int = 50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM volunteer_applications ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_volunteer_applications_by_status(status: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM volunteer_applications WHERE status = ? ORDER BY id DESC", (status,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def update_volunteer_application_status(application_id: int, status: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE volunteer_applications SET status = ? WHERE id = ?",
        (status, application_id)
    )
    conn.commit()
    conn.close()

# ==========================================
# STAFF REMOVAL REQUESTS HELPERS
# ==========================================

def create_removal_request(staff_id: int, requested_by: int):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if pending request already exists
    cursor.execute("SELECT id FROM staff_removal_requests WHERE staff_id = ? AND status = 'pending'", (staff_id,))
    if cursor.fetchone():
        conn.close()
        return False
        
    cursor.execute(
        "INSERT INTO staff_removal_requests (staff_id, requested_by, timestamp) VALUES (?, ?, ?)",
        (staff_id, requested_by, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return True

def get_pending_removal_requests():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id, r.timestamp, 
               s.id as staff_id, s.username as staff_username, s.full_name as staff_name,
               m.username as manager_username, m.full_name as manager_name
        FROM staff_removal_requests r
        JOIN users s ON r.staff_id = s.id
        JOIN users m ON r.requested_by = m.id
        WHERE r.status = 'pending'
        ORDER BY r.id DESC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def resolve_removal_request(request_id: int, status: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE staff_removal_requests SET status = ? WHERE id = ?",
        (status, request_id)
    )
    conn.commit()
    conn.close()

# ==========================================
# USERS (RBAC) HELPERS
# ==========================================

def create_user(username: str, password_hash: str, full_name: str, role: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (username, password_hash, full_name, role, datetime.now().isoformat())
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False # Username already exists
    finally:
        conn.close()

def get_user_by_username(username: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_users_by_role(role: str = None):
    conn = get_connection()
    cursor = conn.cursor()
    if role:
        cursor.execute("SELECT id, username, full_name, role, created_at FROM users WHERE role = ? ORDER BY id DESC", (role,))
    else:
        cursor.execute("SELECT id, username, full_name, role, created_at FROM users ORDER BY id DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_user(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

# ==========================================
# EVENTS HELPERS
# ==========================================

def create_event(title: str, description: str, event_date: str, manager_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO events (title, description, event_date, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
        (title, description, event_date, manager_id, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_events():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.*, u.full_name as manager_name 
        FROM events e 
        LEFT JOIN users u ON e.created_by = u.id 
        ORDER BY e.id DESC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def record_attendance(event_id: int, staff_id: int, status: str = 'attended'):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO event_attendance (event_id, staff_id, status, timestamp) VALUES (?, ?, ?, ?)",
            (event_id, staff_id, status, datetime.now().isoformat())
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False # Already registered
    finally:
        conn.close()

def get_staff_attendance(staff_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.status, a.timestamp as joined_at, e.title, e.event_date, e.description 
        FROM event_attendance a
        JOIN events e ON a.event_id = e.id
        WHERE a.staff_id = ?
        ORDER BY a.id DESC
    """, (staff_id,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

# ==========================================
# ADMIN VIEW HELPERS
# ==========================================

def get_recommendations(limit: int = 50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM recommendations ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_contact_queries(limit: int = 100):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contact_queries ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'staff'")
    staff_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'manager'")
    manager_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM events")
    event_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM volunteer_applications WHERE status = 'accepted'")
    volunteer_count = cursor.fetchone()['count']
    
    conn.close()
    return {
        "staff_count": staff_count,
        "manager_count": manager_count,
        "event_count": event_count,
        "volunteer_count": volunteer_count
    }

# ==========================================
# INTERNAL MESSAGING HELPERS
# ==========================================

def get_or_create_conversation(user1_id: int, user2_id: int) -> int:
    # Ensure user1_id < user2_id to maintain uniqueness
    u1, u2 = min(user1_id, user2_id), max(user1_id, user2_id)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?", (u1, u2))
    row = cursor.fetchone()
    if row:
        conn.close()
        return row['id']
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    cursor.execute(
        "INSERT INTO conversations (user1_id, user2_id, updated_at) VALUES (?, ?, ?)",
        (u1, u2, timestamp)
    )
    conv_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return conv_id

def get_user_conversations(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    # Fetch conversations, along with the other user's info, latest non-deleted message, and unread count
    query = """
        SELECT c.id, c.updated_at,
               u.id as other_user_id, u.username as other_username, u.full_name as other_full_name, u.role as other_role,
               (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.is_deleted = 0 ORDER BY m.timestamp DESC LIMIT 1) as last_message,
               (SELECT timestamp FROM messages m WHERE m.conversation_id = c.id AND m.is_deleted = 0 ORDER BY m.timestamp DESC LIMIT 1) as last_message_time,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = 0 AND m.sender_id != ?) as unread_count
        FROM conversations c
        JOIN users u ON (c.user1_id = u.id OR c.user2_id = u.id) AND u.id != ?
        WHERE c.user1_id = ? OR c.user2_id = ?
        ORDER BY last_message_time DESC NULLS LAST, c.updated_at DESC
    """
    cursor.execute(query, (user_id, user_id, user_id, user_id))
    conversations = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return conversations

def get_conversation_messages(conversation_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.is_deleted, m.timestamp,
               u.username as sender_username, u.role as sender_role
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.timestamp ASC
    """, (conversation_id,))
    messages = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return messages

def add_message(conversation_id: int, sender_id: int, content: str):
    timestamp = datetime.utcnow().isoformat() + "Z"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (conversation_id, sender_id, content, timestamp) VALUES (?, ?, ?, ?)",
        (conversation_id, sender_id, content, timestamp)
    )
    msg_id = cursor.lastrowid
    # Update conversation updated_at
    cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (timestamp, conversation_id))
    conn.commit()
    conn.close()
    return msg_id

def mark_conversation_read(conversation_id: int, user_id: int):
    # user_id is the person reading the messages, so mark messages where sender_id != user_id as read
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0",
        (conversation_id, user_id)
    )
    conn.commit()
    conn.close()

def delete_message(message_id: int, user_id: int):
    # Only allow soft delete if the user is the sender
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE messages SET is_deleted = 1 WHERE id = ? AND sender_id = ?",
        (message_id, user_id)
    )
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def get_conversation_by_id(conversation_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None
