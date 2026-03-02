"""
Announcement routes — /api/announcements
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_announcement_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.announcement_service import AnnouncementService
from app.models.common import AnnouncementCreate

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("")
async def get_announcements(
    current_user: CurrentUser = Depends(get_current_user),
    service: AnnouncementService = Depends(get_announcement_service),
):
    try:
        return await service.get_announcements(current_user.org_id, current_user.id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("")
async def create_announcement(
    body: AnnouncementCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: AnnouncementService = Depends(get_announcement_service),
):
    try:
        data = body.model_dump(exclude_none=True)
        recipient_ids = data.pop("recipient_ids", None)
        return await service.create_announcement(
            org_id=current_user.org_id,
            creator_id=current_user.id,
            creator_name=current_user.email or "Admin",
            announcement_data=data,
            recipient_ids=recipient_ids,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: AnnouncementService = Depends(get_announcement_service),
):
    try:
        await service.delete_announcement(announcement_id)
        return {"status": "deleted"}
    except TalentOpsException as e:
        raise exception_to_http(e)
