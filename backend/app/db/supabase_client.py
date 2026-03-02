"""
TalentOps Backend — Supabase Client (Database-only)
Server-side Supabase client using the service_role key.
"""
from supabase import create_client, Client
from functools import lru_cache
from app.core.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    Create and cache a server-side Supabase client.
    Uses the service_role key — this bypasses RLS and gives full DB access.
    NEVER expose this client or key to the frontend.
    """
    settings = get_settings()
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
    return client
