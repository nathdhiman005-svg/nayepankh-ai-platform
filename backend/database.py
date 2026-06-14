"""
database.py - SQLite Database Setup for NayePankh AI Assistant

This module handles all database operations:
- Creating tables for chat history, recommendations, and generated content
- Inserting and retrieving records

We use SQLite because it's simple, file-based, and requires no setup.
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
    """
    Initialize the database by creating all required tables.
    This is called when the FastAPI app starts up.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Table 1: Chat History
    # Stores all chatbot conversations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_message TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # Table 2: Volunteer Recommendations
    # Stores personalized volunteer recommendation requests and results
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

    # Table 3: Generated Content
    # Stores AI-generated campaign content
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS generated_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_topic TEXT NOT NULL,
            generated_text TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] Database initialized successfully!")


def save_chat(user_message: str, ai_response: str):
    """Save a chat conversation to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (user_message, ai_response, timestamp) VALUES (?, ?, ?)",
        (user_message, ai_response, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def save_recommendation(name: str, interests: str, skills: str, available_time: str, recommendation: str):
    """Save a volunteer recommendation to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO recommendations (name, interests, skills, available_time, recommendation, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (name, interests, skills, available_time, recommendation, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def save_generated_content(campaign_topic: str, generated_text: str):
    """Save generated campaign content to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO generated_content (campaign_topic, generated_text, timestamp) VALUES (?, ?, ?)",
        (campaign_topic, generated_text, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def get_chat_history(limit: int = 50):
    """Retrieve recent chat history."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM chat_history ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_recommendations(limit: int = 50):
    """Retrieve recent recommendations."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM recommendations ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows
