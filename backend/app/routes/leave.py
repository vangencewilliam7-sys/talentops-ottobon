"""
Leave routes — /api/leave
"""
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_leave_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.leave_service import LeaveService
from app.models.common import LeaveApplyRequest

router = APIRouter(prefix="/api/leave", tags=["leave"])


@router.post("/apply")
async def apply_leave(
    body: LeaveApplyRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaveService = Depends(get_leave_service),
):
    try:
        leave_data = body.model_dump(exclude_none=True)
        return await service.apply_leave(
            current_user.id, current_user.org_id, leave_data,
            sender_name=current_user.email or "Employee",
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaveService = Depends(get_leave_service),
):
    try:
        return await service.approve_leave(
            leave_id, current_user.id, current_user.email or "Manager",
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/{leave_id}/reject")
async def reject_leave(
    leave_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaveService = Depends(get_leave_service),
):
    try:
        return await service.reject_leave(
            leave_id, current_user.id, current_user.email or "Manager",
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/my")
async def get_my_leaves(
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaveService = Depends(get_leave_service),
):
    try:
        return await service.get_my_leaves(current_user.id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/team")
async def get_team_leaves(
    status: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaveService = Depends(get_leave_service),
):
    try:
        return await service.get_team_leaves(current_user.org_id, status)
    except TalentOpsException as e:
        raise exception_to_http(e)
