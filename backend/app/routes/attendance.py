"""
Attendance routes — /api/attendance
"""
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_attendance_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.post("/clock-in")
async def clock_in(
    current_user: CurrentUser = Depends(get_current_user),
    service: AttendanceService = Depends(get_attendance_service),
):
    try:
        return await service.clock_in(current_user.id, current_user.org_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/clock-out")
async def clock_out(
    current_user: CurrentUser = Depends(get_current_user),
    service: AttendanceService = Depends(get_attendance_service),
):
    try:
        return await service.clock_out(current_user.id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("")
async def get_my_attendance(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: CurrentUser = Depends(get_current_user),
    service: AttendanceService = Depends(get_attendance_service),
):
    try:
        return await service.get_my_attendance(current_user.id, start_date, end_date)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/team")
async def get_team_attendance(
    target_date: str = Query(...),
    current_user: CurrentUser = Depends(get_current_user),
    service: AttendanceService = Depends(get_attendance_service),
):
    try:
        return await service.get_team_attendance(current_user.org_id, target_date)
    except TalentOpsException as e:
        raise exception_to_http(e)
