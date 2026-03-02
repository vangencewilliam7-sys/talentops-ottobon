"""
Messaging routes — /api/messaging
"""
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_messaging_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.messaging_service import MessagingService
from app.models.messaging import MessageCreate, DMCreate, TeamChatCreate, MemberAction

router = APIRouter(prefix="/api/messaging", tags=["messaging"])


@router.get("/conversations")
async def get_conversations(
    category: str = Query("myself"),
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        return await service.get_conversations(current_user.id, category, current_user.org_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        return await service.get_messages(conversation_id, limit)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        return await service.send_message(conversation_id, current_user.id, body.content)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/conversations/dm")
async def create_dm(
    body: DMCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        return await service.create_dm(current_user.id, body.user_id_2, current_user.org_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/conversations/team")
async def create_team_chat(
    body: TeamChatCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        return await service.create_team_chat(
            current_user.id, body.member_ids, body.team_name, current_user.org_id,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/conversations/{conversation_id}/members")
async def get_members(
    conversation_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        return await service.get_members(conversation_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/conversations/{conversation_id}/members")
async def add_member(
    conversation_id: str,
    body: MemberAction,
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        return await service.add_member(conversation_id, body.user_id, current_user.id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.delete("/conversations/{conversation_id}/members/{user_id}")
async def remove_member(
    conversation_id: str,
    user_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: MessagingService = Depends(get_messaging_service),
):
    try:
        await service.remove_member(conversation_id, user_id, current_user.id)
        return {"status": "removed"}
    except TalentOpsException as e:
        raise exception_to_http(e)
