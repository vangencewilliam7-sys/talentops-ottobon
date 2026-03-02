"""
Pydantic models for Attendance, Payroll, Leave, Announcements, Notifications.
"""
from pydantic import BaseModel


# ── Attendance ────────────────────────────────────────────

class AttendanceQuery(BaseModel):
    start_date: str
    end_date: str


class TeamAttendanceQuery(BaseModel):
    target_date: str


# ── Payroll ───────────────────────────────────────────────

class PayrollGenerateRequest(BaseModel):
    month: str  # e.g., "2026-03"


class PayrollCompleteRequest(BaseModel):
    payroll_id: int


# ── Leave ─────────────────────────────────────────────────

class LeaveApplyRequest(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str | None = None
    manager_id: str | None = None


# ── Announcements ─────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: str | None = None
    priority: str = "normal"
    recipient_ids: list[str] | None = None


# ── Notifications ─────────────────────────────────────────

class NotificationCreate(BaseModel):
    receiver_id: str
    message: str
    type: str


class BulkNotificationCreate(BaseModel):
    receiver_ids: list[str]
    message: str
    type: str
