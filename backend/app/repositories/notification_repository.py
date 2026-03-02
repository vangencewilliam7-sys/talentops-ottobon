"""
Notification Repository — Data access layer for notifications.
Replaces services/notificationService.js as pure Python.
"""
from datetime import datetime, timezone
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository):

    async def create_notification(self, notification: dict) -> dict:
        """Insert a single notification."""
        notification.setdefault("is_read", False)
        notification.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        response = self.db.table("notifications").insert(notification).execute()
        return response.data[0]

    async def create_bulk_notifications(self, notifications: list[dict]) -> list[dict]:
        """Insert multiple notifications at once."""
        for n in notifications:
            n.setdefault("is_read", False)
            n.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        response = self.db.table("notifications").insert(notifications).execute()
        return response.data or []

    async def get_notifications_for_user(self, user_id: str, limit: int = 50) -> list[dict]:
        """Fetch notifications for a user, newest first."""
        response = self.db.table("notifications").select("*").eq(
            "receiver_id", user_id
        ).order("created_at", desc=True).limit(limit).execute()
        return response.data or []

    async def mark_as_read(self, notification_id: int) -> None:
        """Mark a single notification as read."""
        self.db.table("notifications").update(
            {"is_read": True}
        ).eq("id", notification_id).execute()

    async def mark_all_as_read(self, user_id: str) -> None:
        """Mark all notifications for a user as read."""
        self.db.table("notifications").update(
            {"is_read": True}
        ).eq("receiver_id", user_id).eq("is_read", False).execute()
