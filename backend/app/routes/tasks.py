"""
Task routes — /api/tasks
"""
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_task_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.task_service import TaskService
from app.models.task import TaskCreate, TaskUpdate, ProofSubmission, PhaseAction, AccessRequest

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
async def get_tasks(
    project_id: str | None = Query(None),
    view_mode: str = Query("default"),
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.get_tasks(
            org_id=current_user.org_id,
            project_id=project_id,
            view_mode=view_mode,
            user_id=current_user.id,
            user_role=current_user.role,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/{task_id}")
async def get_task(
    task_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.get_task_by_id(task_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/{task_id}/steps")
async def get_task_steps(
    task_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.get_task_steps(task_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.get("/assignees/list")
async def get_assignees(
    project_id: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.get_task_assignees(current_user.org_id, project_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("")
async def create_task(
    body: TaskCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        task_data = body.model_dump(exclude_none=True)
        steps = task_data.pop("steps", None)
        ai_meta = task_data.pop("ai_metadata", None)
        return await service.create_task(
            task_data=task_data,
            user_id=current_user.id,
            org_id=current_user.org_id,
            sender_name=current_user.email or "Unknown",
            steps=steps,
            ai_metadata=ai_meta,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.patch("/{task_id}")
async def update_task(
    task_id: int,
    body: TaskUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        updates = body.model_dump(exclude_none=True)
        return await service.update_task(task_id, updates)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        await service.delete_task(task_id)
        return {"status": "deleted"}
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/{task_id}/proof")
async def submit_proof(
    task_id: int,
    body: ProofSubmission,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.submit_proof(
            task_id=task_id,
            user_id=current_user.id,
            org_id=current_user.org_id,
            proof_text=body.proof_text,
            proof_hours=body.proof_hours,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/{task_id}/approve")
async def approve_phase(
    task_id: int,
    body: PhaseAction,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.approve_phase(task_id, body.phase_key, current_user.org_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/{task_id}/reject")
async def reject_phase(
    task_id: int,
    body: PhaseAction,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.reject_phase(task_id, body.phase_key, current_user.org_id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/{task_id}/access-request")
async def request_access(
    task_id: int,
    body: AccessRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    try:
        return await service.request_access(
            task_id, current_user.id, current_user.org_id,
            body.reason, body.task_title,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)
