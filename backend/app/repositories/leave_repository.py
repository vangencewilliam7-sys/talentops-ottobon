"""
Leave Repository — Data access layer for leave management.
Replaces rpc_apply_leave, rpc_approve_leave, rpc_reject_leave, etc. as pure Python.
"""
from datetime import datetime, timezone
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError, ValidationError


class LeaveRepository(BaseRepository):

    async def apply_leave(self, leave_data: dict) -> dict:
        """Create a new leave request."""
        leave_data.setdefault("status", "pending")
        leave_data.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        response = self.db.table("leaves").insert(leave_data).execute()
        return response.data[0]

    async def get_leave_by_id(self, leave_id: int) -> dict:
        """Fetch a leave request by ID."""
        response = self.db.table("leaves").select("*").eq(
            "id", leave_id
        ).maybe_single().execute()
        if not response.data:
            raise NotFoundError("Leave", leave_id)
        return response.data

    async def update_leave_status(self, leave_id: int, status: str, reviewer_id: str) -> dict:
        """Approve or reject a leave request."""
        response = self.db.table("leaves").update({
            "status": status,
            "reviewed_by": reviewer_id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", leave_id).execute()
        if not response.data:
            raise NotFoundError("Leave", leave_id)
        return response.data[0]

    async def get_my_leaves(self, user_id: str) -> list[dict]:
        """Fetch all leave requests for the current user."""
        response = self.db.table("leaves").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).execute()
        return response.data or []

    async def get_team_leaves(self, org_id: str, status: str | None = None) -> list[dict]:
        """Fetch leave requests for a team/org, optionally filtered by status."""
        query = self.db.table("leaves").select(
            "*, profiles:user_id (id, full_name, avatar_url, role, department)"
        ).eq("org_id", org_id)

        if status:
            query = query.eq("status", status)

        query = query.order("created_at", desc=True)
        response = query.execute()
        return response.data or []
