"""
Payroll routes — /api/payroll
"""
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_payroll_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.payroll_service import PayrollService
from app.models.common import PayrollGenerateRequest

router = APIRouter(prefix="/api/payroll", tags=["payroll"])


@router.post("/generate")
async def generate_payroll(
    body: PayrollGenerateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: PayrollService = Depends(get_payroll_service),
):
    try:
        return await service.generate_monthly_payroll(current_user.org_id, body.month)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/complete/{payroll_id}")
async def complete_payroll(
    payroll_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: PayrollService = Depends(get_payroll_service),
):
    try:
        return await service.complete_payroll(payroll_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/history")
async def get_org_payroll_history(
    month: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    service: PayrollService = Depends(get_payroll_service),
):
    try:
        return await service.get_org_payroll_history(current_user.org_id, month)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/my-history")
async def get_my_payroll_history(
    current_user: CurrentUser = Depends(get_current_user),
    service: PayrollService = Depends(get_payroll_service),
):
    try:
        return await service.get_my_payroll_history(current_user.id)
    except TalentOpsException as e:
        raise exception_to_http(e)
