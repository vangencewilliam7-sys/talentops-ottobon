"""
AI routes — /api/ai
Risk analysis and task plan generation.
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_ai_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.ai_service import AIService
from app.models.task import RiskAnalysisRequest, TaskPlanRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/analyze-risk")
async def analyze_risk(
    body: RiskAnalysisRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: AIService = Depends(get_ai_service),
):
    try:
        return await service.analyze_risk(
            task_id=body.task_id,
            task_title=body.task_title,
            metrics=body.metrics,
            employee_context=body.employee_context,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/generate-plan")
async def generate_plan(
    body: TaskPlanRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: AIService = Depends(get_ai_service),
):
    try:
        return await service.generate_plan(
            title=body.title,
            description=body.description,
            skills=body.skills,
            task_type=body.task_type,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)
