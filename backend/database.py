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

def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'staff'")
    staff_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'manager'")
    manager_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM events")
    event_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM recommendations")
    volunteer_count = cursor.fetchone()['count']
    
    conn.close()
    return {
        "staff_count": staff_count,
        "manager_count": manager_count,
        "event_count": event_count,
        "volunteer_count": volunteer_count
    }
