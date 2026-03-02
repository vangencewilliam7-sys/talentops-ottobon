"""
Pydantic models for Messaging.
"""
from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str


class DMCreate(BaseModel):
    user_id_2: str


class TeamChatCreate(BaseModel):
    member_ids: list[str]
    team_name: str


class MemberAction(BaseModel):
    user_id: str
