"""
Pydantic models for Profiles.
"""
from pydantic import BaseModel


class ProfileResponse(BaseModel):
    id: str
    full_name: str | None = None
    email: str | None = None
    role: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    department: str | None = None
    designation: str | None = None
    date_of_joining: str | None = None
    org_id: str | None = None
    bio: str | None = None
    technical_scores: dict | None = None


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    department: str | None = None
    designation: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
