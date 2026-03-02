"""
Pydantic models for Tasks.
"""
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assigned_to: str | None = None
    project_id: str | None = None
    priority: str = "medium"
    allocated_hours: float | None = None
    task_type: str | None = None
    skill_tags: list[str] | None = None
    steps: list[dict] | None = None
    ai_metadata: dict | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = None
    current_phase: str | None = None


class ProofSubmission(BaseModel):
    proof_text: str = ""
    proof_hours: float | None = None


class PhaseAction(BaseModel):
    phase_key: str


class AccessRequest(BaseModel):
    reason: str
    task_title: str


class TaskPlanRequest(BaseModel):
    title: str
    description: str
    skills: list[str] | None = None
    task_type: str = "General"


class RiskAnalysisRequest(BaseModel):
    task_id: int
    task_title: str
    metrics: dict
    employee_context: dict | None = None
