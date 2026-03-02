"""
Announcement Repository — Data access layer for announcements.
Replaces rpc_create_announcement and rpc_get_my_announcements as pure Python.
"""
from datetime import datetime, timezone
from app.repositories.base import BaseRepository


class AnnouncementRepository(BaseRepository):

    async def create_announcement(self, announcement: dict) -> dict:
        """Create a new announcement."""
        announcement.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        response = self.db.table("announcements").insert(announcement).execute()
        return response.data[0]

    async def get_announcements(self, org_id: str, user_id: str | None = None) -> list[dict]:
        """
        Fetch announcements for an organization.
        Filters by target audience if applicable.
        """
        query = self.db.table("announcements").select(
            "*, profiles:created_by (id, full_name, avatar_url)"
        ).eq("org_id", org_id)

        query = query.order("created_at", desc=True)
        response = query.execute()
        return response.data or []

    async def get_announcement_by_id(self, announcement_id: int) -> dict:
        """Fetch a single announcement."""
        from app.core.exceptions import NotFoundError
        response = self.db.table("announcements").select("*").eq(
            "id", announcement_id
        ).maybe_single().execute()
        if not response.data:
            raise NotFoundError("Announcement", announcement_id)
        return response.data

    async def delete_announcement(self, announcement_id: int) -> None:
        """Delete an announcement."""
        self.db.table("announcements").delete().eq("id", announcement_id).execute()
