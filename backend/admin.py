from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from .auth import get_password_hash, verify_password, create_access_token, get_current_user, require_role
from .database import (
    get_user_by_username, create_user, get_users_by_role, delete_user,
    create_event, get_events, record_attendance, get_staff_attendance,
    get_dashboard_stats, get_recommendations
)

router = APIRouter()

# ==========================================
# AUTHENTICATION
# ==========================================

class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "staff" # 'staff', 'manager', 'head'

@router.post("/api/auth/signup")
async def signup(request: SignupRequest, current_user: dict = Depends(require_role(["manager", "head"]))):
    # Managers can only create staff. Head can create manager or staff.
    if current_user["role"] == "manager" and request.role != "staff":
        raise HTTPException(status_code=403, detail="Managers can only create staff accounts")
        
    if request.role not in ['staff', 'manager', 'head']:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    hashed_pw = get_password_hash(request.password)
    success = create_user(request.username, hashed_pw, request.full_name, request.role)
    
    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    return {"message": f"{request.role.capitalize()} account created successfully"}

@router.post("/api/auth/login")
async def login(request: LoginRequest):
    user = get_user_by_username(request.username)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "full_name": user["full_name"]
    }

@router.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    # Don't return the password hash
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "created_at": current_user["created_at"]
    }

# ==========================================
# STAFF ENDPOINTS
# ==========================================

@router.get("/api/staff/dashboard")
async def get_staff_dashboard(current_user: dict = Depends(require_role(["staff", "manager", "head"]))):
    """Staff dashboard data: mostly their attendance records to encourage them."""
    attendance = get_staff_attendance(current_user["id"])
    return {
        "events_joined": len(attendance),
        "history": attendance
    }

# ==========================================
# MANAGER ENDPOINTS
# ==========================================

class EventCreateRequest(BaseModel):
    title: str
    description: str
    event_date: str

class AttendanceRequest(BaseModel):
    staff_id: int
    event_id: int

@router.get("/api/manager/staff")
async def get_staff_list(current_user: dict = Depends(require_role(["manager", "head"]))):
    """Managers can view all staff."""
    return get_users_by_role("staff")

@router.delete("/api/manager/staff/{user_id}")
async def remove_staff(user_id: int, current_user: dict = Depends(require_role(["manager", "head"]))):
    """Managers can delete staff records."""
    delete_user(user_id)
    return {"message": "Staff removed successfully"}

@router.get("/api/manager/events")
async def get_all_events(current_user: dict = Depends(require_role(["manager", "head", "staff"]))):
    return get_events()

@router.post("/api/manager/events")
async def create_new_event(request: EventCreateRequest, current_user: dict = Depends(require_role(["manager", "head"]))):
    create_event(request.title, request.description, request.event_date, current_user["id"])
    return {"message": "Event created successfully"}

@router.post("/api/manager/attendance")
async def mark_attendance(request: AttendanceRequest, current_user: dict = Depends(require_role(["manager", "head"]))):
    success = record_attendance(request.event_id, request.staff_id, "attended")
    if not success:
        raise HTTPException(status_code=400, detail="Staff already recorded for this event")
    return {"message": "Attendance recorded"}

@router.get("/api/manager/volunteers")
async def view_public_volunteers(current_user: dict = Depends(require_role(["manager", "head"]))):
    """View volunteer applications from the public website."""
    return get_recommendations(limit=100)

# ==========================================
# HEAD ENDPOINTS
# ==========================================

@router.get("/api/head/dashboard")
async def get_head_dashboard(current_user: dict = Depends(require_role(["head"]))):
    """Head dashboard data: aggregate stats and all users."""
    stats = get_dashboard_stats()
    managers = get_users_by_role("manager")
    return {
        "stats": stats,
        "managers": managers
    }
