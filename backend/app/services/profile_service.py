"""
Profile Service — Business logic for user profiles.
"""
from app.repositories.profile_repository import ProfileRepository


class ProfileService:
    def __init__(self, repo: ProfileRepository):
        self._repo = repo

    async def get_my_profile(self, user_id: str) -> dict:
        """Get the current user's full profile."""
        return await self._repo.get_profile_by_id(user_id)

    async def update_my_profile(self, user_id: str, updates: dict) -> dict:
        """Update the current user's profile."""
        # Strip any fields that shouldn't be user-editable
        protected_fields = {"id", "org_id", "role", "created_at"}
        safe_updates = {k: v for k, v in updates.items() if k not in protected_fields}
        return await self._repo.update_profile(user_id, safe_updates)

    async def get_org_members(self, org_id: str) -> list[dict]:
        """Get all members of an organization."""
        return await self._repo.get_profiles_by_org(org_id)
