"""
TalentOps Backend — Security
JWT verification for Supabase auth tokens.
"""
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel

from app.core.config import get_settings, Settings
from app.core.exceptions import UnauthorizedError


security_scheme = HTTPBearer()


class CurrentUser(BaseModel):
    """Decoded user context from the Supabase JWT."""
    id: str
    email: str | None = None
    role: str | None = None          # app_metadata.role if set
    org_id: str | None = None        # app_metadata.org_id if set
    raw_claims: dict = {}


def decode_supabase_jwt(token: str, settings: Settings) -> dict:
    """
    Decode and verify a Supabase-issued JWT.
    Supabase uses HS256 with the JWT secret from the project settings.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.PyJWTError as e:
        raise UnauthorizedError(f"Token verification failed: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """
    FastAPI dependency — extracts and verifies the current user from the
    Authorization header. Inject this into any protected route.
    """
    payload = decode_supabase_jwt(credentials.credentials, settings)

    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedError("Token missing 'sub' claim")

    # Supabase stores custom claims in app_metadata / user_metadata
    app_meta = payload.get("app_metadata", {})
    user_meta = payload.get("user_metadata", {})

    return CurrentUser(
        id=sub,
        email=payload.get("email"),
        role=app_meta.get("role") or user_meta.get("role"),
        org_id=app_meta.get("org_id") or user_meta.get("org_id"),
        raw_claims=payload,
    )
