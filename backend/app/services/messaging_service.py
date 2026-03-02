"""
Messaging Service — Business logic for conversations and messages.
Replaces services/messageService.js group admin and DM creation logic.
"""
from datetime import datetime, timezone
from app.repositories.message_repository import MessageRepository
from app.repositories.notification_repository import NotificationRepository
from app.core.exceptions import ForbiddenError, ValidationError


class MessagingService:
    def __init__(self, repo: MessageRepository, notification_repo: NotificationRepository):
        self._repo = repo
        self._notification_repo = notification_repo

    # ── Conversations ─────────────────────────────────────

    async def get_conversations(self, user_id: str, category: str, org_id: str) -> list[dict]:
        return await self._repo.get_conversations_by_user(user_id, category, org_id)

    async def get_messages(self, conversation_id: str, limit: int = 50) -> list[dict]:
        return await self._repo.get_messages(conversation_id, limit)

    async def send_message(
        self, conversation_id: str, sender_id: str, content: str
    ) -> dict:
        """Send a message and update conversation's last_message."""
        message = await self._repo.create_message({
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await self._repo.update_conversation(conversation_id, {
            "last_message": content,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        return message

    async def create_dm(self, user_id_1: str, user_id_2: str, org_id: str) -> dict:
        """Create or find an existing DM conversation."""
        existing = await self._repo.find_existing_dm(user_id_1, user_id_2, org_id)
        if existing:
            return existing

        conversation = await self._repo.create_conversation({
            "type": "dm",
            "org_id": org_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await self._repo.add_member(conversation["id"], user_id_1, is_admin=False)
        await self._repo.add_member(conversation["id"], user_id_2, is_admin=False)
        return conversation

    async def create_team_chat(
        self, creator_id: str, member_ids: list[str], team_name: str, org_id: str
    ) -> dict:
        """Create a team conversation."""
        conversation = await self._repo.create_conversation({
            "type": "team",
            "name": team_name,
            "org_id": org_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Creator is admin
        await self._repo.add_member(conversation["id"], creator_id, is_admin=True)
        for member_id in member_ids:
            if member_id != creator_id:
                await self._repo.add_member(conversation["id"], member_id, is_admin=False)
        return conversation

    # ── Group Admin ───────────────────────────────────────

    async def get_members(self, conversation_id: str) -> list[dict]:
        return await self._repo.get_conversation_members(conversation_id)

    async def add_member(self, conversation_id: str, user_id: str, admin_id: str) -> dict:
        """Add a member (admin only)."""
        is_admin = await self._repo.is_admin(conversation_id, admin_id)
        if not is_admin:
            raise ForbiddenError("Only admins can add members")
        return await self._repo.add_member(conversation_id, user_id)

    async def remove_member(self, conversation_id: str, user_id: str, admin_id: str) -> None:
        """Remove a member (admin only)."""
        is_admin = await self._repo.is_admin(conversation_id, admin_id)
        if not is_admin:
            raise ForbiddenError("Only admins can remove members")
        if user_id == admin_id:
            raise ValidationError("Admins cannot remove themselves")
        await self._repo.remove_member(conversation_id, user_id)
