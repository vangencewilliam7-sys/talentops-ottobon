"""
Notification Service — Business logic for sending notifications.
"""
from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, repo: NotificationRepository):
        self._repo = repo

    async def send_notification(
        self, receiver_id: str, sender_id: str, sender_name: str,
        message: str, notification_type: str,
    ) -> dict:
        return await self._repo.create_notification({
            "receiver_id": receiver_id,
            "sender_id": sender_id,
            "sender_name": sender_name,
            "message": message,
            "type": notification_type,
        })

    async def send_bulk_notifications(
        self, receiver_ids: list[str], sender_id: str, sender_name: str,
        message: str, notification_type: str,
    ) -> list[dict]:
        notifications = [
            {
                "receiver_id": rid,
                "sender_id": sender_id,
                "sender_name": sender_name,
                "message": message,
                "type": notification_type,
            }
            for rid in receiver_ids
        ]
        return await self._repo.create_bulk_notifications(notifications)

    async def send_task_assigned(
        self, assigned_to: str, assigner_id: str, assigner_name: str, task_title: str,
    ) -> dict:
        return await self.send_notification(
            assigned_to, assigner_id, assigner_name,
            f"You have been assigned a new task: {task_title}",
            "task_assigned",
        )

    async def send_announcement(
        self, recipient_ids: list[str], creator_id: str, creator_name: str, title: str,
    ) -> list[dict]:
        return await self.send_bulk_notifications(
            recipient_ids, creator_id, creator_name, title, "announcement",
        )

    async def get_my_notifications(self, user_id: str, limit: int = 50) -> list[dict]:
        return await self._repo.get_notifications_for_user(user_id, limit)

    async def mark_read(self, notification_id: int) -> None:
        await self._repo.mark_as_read(notification_id)

    async def mark_all_read(self, user_id: str) -> None:
        await self._repo.mark_all_as_read(user_id)
