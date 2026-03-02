"""
Attendance Repository — Data access layer for attendance.
Replaces rpc_clock_in, rpc_clock_out, rpc_get_attendance, rpc_team_attendance as pure Python.
"""
from datetime import datetime, timezone, date
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError, ValidationError


class AttendanceRepository(BaseRepository):

    async def clock_in(self, user_id: str, org_id: str) -> dict:
        """Record a clock-in event."""
        # Check if already clocked in today
        today = date.today().isoformat()
        existing = self.db.table("attendance").select("id, clock_in").eq(
            "user_id", user_id
        ).eq("date", today).is_("clock_out", "null").maybe_single().execute()

        if existing.data:
            raise ValidationError("Already clocked in for today")

        now = datetime.now(timezone.utc).isoformat()
        record = {
            "user_id": user_id,
            "org_id": org_id,
            "date": today,
            "clock_in": now,
            "status": "present",
        }
        response = self.db.table("attendance").insert(record).execute()
        return response.data[0]

    async def clock_out(self, user_id: str) -> dict:
        """Record a clock-out event for today's open attendance record."""
        today = date.today().isoformat()
        existing = self.db.table("attendance").select("id").eq(
            "user_id", user_id
        ).eq("date", today).is_("clock_out", "null").maybe_single().execute()

        if not existing.data:
            raise ValidationError("No open clock-in found for today")

        now = datetime.now(timezone.utc).isoformat()
        response = self.db.table("attendance").update({
            "clock_out": now,
        }).eq("id", existing.data["id"]).execute()
        return response.data[0]

    async def get_attendance(self, user_id: str, start_date: str, end_date: str) -> list[dict]:
        """Fetch attendance records for a user within a date range."""
        response = self.db.table("attendance").select("*").eq(
            "user_id", user_id
        ).gte("date", start_date).lte("date", end_date).order(
            "date", desc=True
        ).execute()
        return response.data or []

    async def get_team_attendance(self, org_id: str, target_date: str) -> list[dict]:
        """Fetch attendance for all users in an org for a specific date."""
        response = self.db.table("attendance").select(
            "*, profiles:user_id (id, full_name, avatar_url, role)"
        ).eq("org_id", org_id).eq("date", target_date).execute()
        return response.data or []
