"""
Announcement Service — Business logic for announcements.
"""
from app.repositories.announcement_repository import AnnouncementRepository
from app.repositories.notification_repository import NotificationRepository


class AnnouncementService:
    def __init__(self, repo: AnnouncementRepository, notification_repo: NotificationRepository):
        self._repo = repo
        self._notification_repo = notification_repo

    async def create_announcement(
        self, org_id: str, creator_id: str, creator_name: str,
        announcement_data: dict, recipient_ids: list[str] | None = None,
    ) -> dict:
        """Create an announcement and notify recipients."""
        announcement_data.update({
            "org_id": org_id,
            "created_by": creator_id,
        })
        result = await self._repo.create_announcement(announcement_data)

        # Notify all recipients
        if recipient_ids:
            notifications = [
                {
                    "receiver_id": rid,
                    "sender_id": creator_id,
                    "sender_name": creator_name,
                    "message": announcement_data.get("title", "New Announcement"),
                    "type": "announcement",
                }
                for rid in recipient_ids if rid != creator_id
            ]
            if notifications:
                await self._notification_repo.create_bulk_notifications(notifications)

        return result

    async def get_announcements(self, org_id: str, user_id: str | None = None) -> list[dict]:
        return await self._repo.get_announcements(org_id, user_id)

    async def delete_announcement(self, announcement_id: int) -> None:
        await self._repo.delete_announcement(announcement_id)
