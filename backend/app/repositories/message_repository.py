"""
Message Repository — Data access layer for conversations and messages.
Replaces services/messageService.js database operations as pure Python.
"""
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError


class MessageRepository(BaseRepository):

    # ── Conversations ─────────────────────────────────────

    async def get_conversations_by_user(self, user_id: str, category: str, org_id: str) -> list[dict]:
        """
        Fetch conversations for a user filtered by category.
        Categories: 'myself' (DMs), 'team', 'organization'
        """
        # First get conversation IDs where user is a member
        memberships = self.db.table("conversation_members").select(
            "conversation_id"
        ).eq("user_id", user_id).execute()
        conv_ids = [m["conversation_id"] for m in (memberships.data or [])]

        if not conv_ids:
            return []

        query = self.db.table("conversations").select("*").in_("id", conv_ids)

        if category == "myself":
            query = query.eq("type", "dm")
        elif category == "team":
            query = query.eq("type", "team")
        elif category == "organization":
            query = query.eq("type", "organization")

        query = query.order("updated_at", desc=True)
        response = query.execute()
        return response.data or []

    async def get_conversation_by_id(self, conversation_id: str) -> dict:
        """Fetch a single conversation."""
        response = self.db.table("conversations").select("*").eq(
            "id", conversation_id
        ).maybe_single().execute()
        if not response.data:
            raise NotFoundError("Conversation", conversation_id)
        return response.data

    async def create_conversation(self, data: dict) -> dict:
        """Create a new conversation."""
        response = self.db.table("conversations").insert(data).execute()
        return response.data[0]

    async def update_conversation(self, conversation_id: str, updates: dict) -> dict:
        """Update conversation fields (e.g., last_message)."""
        response = self.db.table("conversations").update(updates).eq(
            "id", conversation_id
        ).execute()
        return response.data[0] if response.data else {}

    # ── Messages ──────────────────────────────────────────

    async def get_messages(self, conversation_id: str, limit: int = 50) -> list[dict]:
        """Fetch messages for a conversation, ordered by creation time."""
        response = self.db.table("messages").select(
            "*, profiles:sender_id (id, full_name, avatar_url)"
        ).eq("conversation_id", conversation_id).order(
            "created_at", desc=False
        ).limit(limit).execute()
        return response.data or []

    async def create_message(self, message_data: dict) -> dict:
        """Insert a new message."""
        response = self.db.table("messages").insert(message_data).execute()
        return response.data[0]

    # ── Members ───────────────────────────────────────────

    async def get_conversation_members(self, conversation_id: str) -> list[dict]:
        """Fetch all members of a conversation with profile details."""
        response = self.db.table("conversation_members").select(
            "*, profiles:user_id (id, full_name, email, avatar_url, role)"
        ).eq("conversation_id", conversation_id).execute()
        return response.data or []

    async def get_conversation_member_ids(self, conversation_id: str) -> list[str]:
        """Fetch just the user IDs of conversation members."""
        response = self.db.table("conversation_members").select(
            "user_id"
        ).eq("conversation_id", conversation_id).execute()
        return [m["user_id"] for m in (response.data or [])]

    async def add_member(self, conversation_id: str, user_id: str, is_admin: bool = False) -> dict:
        """Add a member to a conversation."""
        response = self.db.table("conversation_members").insert({
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_admin": is_admin,
        }).execute()
        return response.data[0]

    async def remove_member(self, conversation_id: str, user_id: str) -> None:
        """Remove a member from a conversation."""
        self.db.table("conversation_members").delete().eq(
            "conversation_id", conversation_id
        ).eq("user_id", user_id).execute()

    async def is_admin(self, conversation_id: str, user_id: str) -> bool:
        """Check if a user is an admin of a conversation."""
        response = self.db.table("conversation_members").select("is_admin").eq(
            "conversation_id", conversation_id
        ).eq("user_id", user_id).maybe_single().execute()
        return response.data.get("is_admin", False) if response.data else False

    async def find_existing_dm(self, user_id_1: str, user_id_2: str, org_id: str) -> dict | None:
        """Find an existing DM conversation between two users."""
        # Get DM conversations for user 1
        memberships_1 = self.db.table("conversation_members").select(
            "conversation_id"
        ).eq("user_id", user_id_1).execute()
        conv_ids_1 = {m["conversation_id"] for m in (memberships_1.data or [])}

        if not conv_ids_1:
            return None

        # Get DM conversations for user 2 that overlap
        memberships_2 = self.db.table("conversation_members").select(
            "conversation_id"
        ).eq("user_id", user_id_2).execute()
        conv_ids_2 = {m["conversation_id"] for m in (memberships_2.data or [])}

        shared_ids = list(conv_ids_1 & conv_ids_2)
        if not shared_ids:
            return None

        # Check which of the shared conversations is a DM
        response = self.db.table("conversations").select("*").in_(
            "id", shared_ids
        ).eq("type", "dm").eq("org_id", org_id).maybe_single().execute()
        return response.data
