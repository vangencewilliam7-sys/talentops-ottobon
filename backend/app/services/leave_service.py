"""
Leave Service — Business logic for leave management.
"""
from app.repositories.leave_repository import LeaveRepository
from app.repositories.notification_repository import NotificationRepository


class LeaveService:
    def __init__(self, repo: LeaveRepository, notification_repo: NotificationRepository):
        self._repo = repo
        self._notification_repo = notification_repo

    async def apply_leave(self, user_id: str, org_id: str, leave_data: dict, sender_name: str) -> dict:
        """Apply for leave and notify manager."""
        leave_data.update({"user_id": user_id, "org_id": org_id})
        result = await self._repo.apply_leave(leave_data)

        # Notify the manager if specified
        if leave_data.get("manager_id"):
            await self._notification_repo.create_notification({
                "receiver_id": leave_data["manager_id"],
                "sender_id": user_id,
                "sender_name": sender_name,
                "message": f"Leave request from {sender_name}: {leave_data.get('leave_type', 'Leave')}",
                "type": "leave_request",
            })
        return result

    async def approve_leave(self, leave_id: int, reviewer_id: str, reviewer_name: str) -> dict:
        """Approve a leave request and notify the applicant."""
        leave = await self._repo.update_leave_status(leave_id, "approved", reviewer_id)

        await self._notification_repo.create_notification({
            "receiver_id": leave["user_id"],
            "sender_id": reviewer_id,
            "sender_name": reviewer_name,
            "message": "Your leave request has been approved",
            "type": "leave_approved",
        })
        return leave

    async def reject_leave(self, leave_id: int, reviewer_id: str, reviewer_name: str) -> dict:
        """Reject a leave request and notify the applicant."""
        leave = await self._repo.update_leave_status(leave_id, "rejected", reviewer_id)

        await self._notification_repo.create_notification({
            "receiver_id": leave["user_id"],
            "sender_id": reviewer_id,
            "sender_name": reviewer_name,
            "message": "Your leave request has been rejected",
            "type": "leave_rejected",
        })
        return leave

    async def get_my_leaves(self, user_id: str) -> list[dict]:
        return await self._repo.get_my_leaves(user_id)

    async def get_team_leaves(self, org_id: str, status: str | None = None) -> list[dict]:
        return await self._repo.get_team_leaves(org_id, status)
