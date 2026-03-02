"""
Profile Repository — Data access layer for user profiles.
"""
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError


class ProfileRepository(BaseRepository):

    async def get_profile_by_id(self, user_id: str) -> dict:
        """Fetch a single user profile by ID."""
        response = self.db.table("profiles").select(
            "id, full_name, email, role, avatar_url, phone, department, "
            "designation, date_of_joining, org_id, technical_scores, bio"
        ).eq("id", user_id).maybe_single().execute()

        if not response.data:
            raise NotFoundError("Profile", user_id)
        return response.data

    async def get_profiles_by_org(self, org_id: str) -> list[dict]:
        """Fetch all profiles in an organization."""
        response = self.db.table("profiles").select(
            "id, full_name, email, role, avatar_url, department, designation"
        ).eq("org_id", org_id).execute()
        return response.data or []

    async def update_profile(self, user_id: str, updates: dict) -> dict:
        """Update a user's profile fields."""
        response = self.db.table("profiles").update(updates).eq("id", user_id).execute()
        if not response.data:
            raise NotFoundError("Profile", user_id)
        return response.data[0]

    async def get_profiles_by_ids(self, user_ids: list[str]) -> dict[str, dict]:
        """Fetch multiple profiles and return as a dict keyed by user ID."""
        if not user_ids:
            return {}
        response = self.db.table("profiles").select(
            "id, full_name, email, role, avatar_url"
        ).in_("id", user_ids).execute()
        return {p["id"]: p for p in (response.data or [])}
