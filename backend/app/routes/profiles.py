"""
Profile routes — /api/profiles
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_profile_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.profile_service import ProfileService
from app.models.profile import ProfileUpdateRequest

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("/me")
async def get_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
):
    try:
        return await service.get_my_profile(current_user.id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.patch("/me")
async def update_my_profile(
    body: ProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
):
    try:
        updates = body.model_dump(exclude_none=True)
        return await service.update_my_profile(current_user.id, updates)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/org")
async def get_org_members(
    current_user: CurrentUser = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
):
    try:
        return await service.get_org_members(current_user.org_id)
    except TalentOpsException as e:
        raise exception_to_http(e)
