"""
Task Service — Business logic for task management.
Replaces services/modules/task/mutations.js and workflow.js.
"""
from datetime import datetime, timezone
from app.repositories.task_repository import TaskRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.storage_repository import StorageRepository
from app.services.business_hours import calculate_due_datetime
from app.core.exceptions import ForbiddenError, ValidationError


# Phase lifecycle definitions (matching frontend)
TASK_PHASES = [
    {"key": "requirement_refiner", "label": "Requirement", "short": "R"},
    {"key": "design_guidance", "label": "Design", "short": "Ds"},
    {"key": "build_guidance", "label": "Build", "short": "B"},
    {"key": "acceptance_criteria", "label": "Acceptance", "short": "A"},
    {"key": "deployment", "label": "Deployment", "short": "D"},
]


class TaskService:
    def __init__(
        self,
        repo: TaskRepository,
        notification_repo: NotificationRepository,
        storage_repo: StorageRepository,
    ):
        self._repo = repo
        self._notification_repo = notification_repo
        self._storage_repo = storage_repo

    # ── Queries ───────────────────────────────────────────

    async def get_tasks(
        self, org_id: str, project_id: str | None = None,
        view_mode: str = "default", user_id: str | None = None,
        user_role: str | None = None, profile_repo=None,
    ) -> list[dict]:
        """Fetch and enrich tasks with profile names."""
        tasks = await self._repo.get_tasks(org_id, project_id, view_mode, user_id, user_role)

        if not tasks or not profile_repo:
            return tasks

        # Collect unique user IDs for enrichment
        user_ids = set()
        for t in tasks:
            for field in ("assigned_to", "assigned_by", "reassigned_to", "reassigned_from"):
                if t.get(field):
                    user_ids.add(t[field])

        profile_map = await profile_repo.get_profiles_by_ids(list(user_ids)) if user_ids else {}

        # Enrich tasks
        for task in tasks:
            task["assignee_name"] = profile_map.get(task.get("assigned_to"), {}).get("full_name", "Unassigned")
            task["assignee_avatar"] = profile_map.get(task.get("assigned_to"), {}).get("avatar_url")
            task["assigned_by_name"] = profile_map.get(task.get("assigned_by"), {}).get("full_name", "Unknown")

        return tasks

    async def get_task_by_id(self, task_id: int) -> dict:
        return await self._repo.get_task_by_id(task_id)

    async def get_task_steps(self, task_id: int) -> list[dict]:
        return await self._repo.get_task_steps(task_id)

    async def get_task_assignees(self, org_id: str, project_id: str | None = None) -> list[dict]:
        return await self._repo.get_task_assignees(org_id, project_id)

    # ── Mutations ─────────────────────────────────────────

    async def create_task(
        self, task_data: dict, user_id: str, org_id: str,
        sender_name: str, steps: list[dict] | None = None,
        ai_metadata: dict | None = None,
    ) -> dict:
        """
        Create a new task with steps and notifications.
        Handles multi-assignment by creating multiple tasks.
        """
        now = datetime.now(timezone.utc).isoformat()

        # Calculate due date/time from allocated_hours
        allocated_hours = task_data.get("allocated_hours", 0)
        if allocated_hours > 0:
            due = calculate_due_datetime(datetime.now(timezone.utc), allocated_hours)
            task_data["due_date"] = due["due_date"]
            task_data["due_time"] = due["due_time"]

        task_data.update({
            "org_id": org_id,
            "assigned_by": user_id,
            "assigned_by_name": sender_name,
            "status": "active",
            "current_phase": "requirement_refiner",
            "created_at": now,
        })

        if ai_metadata:
            task_data["ai_metadata"] = ai_metadata

        # Create the task
        created_task = await self._repo.create_task(task_data)
        task_id = created_task["id"]

        # Create steps if provided
        if steps:
            for i, step in enumerate(steps):
                step.update({"task_id": task_id, "order_index": i})
                await self._repo.create_task_step(step)

        # Send notification to assignee
        if task_data.get("assigned_to"):
            await self._notification_repo.create_notification({
                "receiver_id": task_data["assigned_to"],
                "sender_id": user_id,
                "sender_name": sender_name,
                "message": f"You have been assigned a new task: {task_data.get('title', '')}",
                "type": "task_assigned",
            })

        return created_task

    async def update_task(self, task_id: int, updates: dict) -> dict:
        return await self._repo.update_task(task_id, updates)

    async def delete_task(self, task_id: int) -> None:
        await self._repo.delete_task(task_id)

    async def archive_task(self, task_id: int) -> dict:
        return await self._repo.update_task(task_id, {"status": "archived"})

    # ── Workflow ──────────────────────────────────────────

    async def submit_proof(
        self, task_id: int, user_id: str, org_id: str,
        proof_text: str = "", proof_hours: float | None = None,
        file_data: list[tuple] | None = None,
    ) -> dict:
        """Submit proof for the current task phase."""
        task = await self._repo.get_task_by_id(task_id)
        current_phase = task.get("current_phase", "requirement_refiner")

        update_data = {
            f"{current_phase}_proof_text": proof_text,
            f"{current_phase}_status": "submitted",
            "status": "pending_approval",
        }

        if proof_hours is not None:
            update_data[f"{current_phase}_proof_hours"] = proof_hours

        # Handle file uploads
        if file_data:
            uploaded = await self._storage_repo.upload_multiple_files(
                bucket="task-proofs",
                path=f"{org_id}/{task_id}/{current_phase}",
                files=file_data,
            )
            update_data[f"{current_phase}_proof_files"] = uploaded

        return await self._repo.update_task(task_id, update_data)

    async def approve_phase(self, task_id: int, phase_key: str, org_id: str) -> dict:
        """Approve a task phase and advance to the next one."""
        task = await self._repo.get_task_by_id(task_id)
        phase_index = next((i for i, p in enumerate(TASK_PHASES) if p["key"] == phase_key), -1)

        update_data = {f"{phase_key}_status": "approved"}

        # Move to next phase or complete
        if phase_index < len(TASK_PHASES) - 1:
            next_phase = TASK_PHASES[phase_index + 1]["key"]
            update_data["current_phase"] = next_phase
            update_data["status"] = "active"
        else:
            update_data["status"] = "completed"
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

        return await self._repo.update_task(task_id, update_data)

    async def reject_phase(self, task_id: int, phase_key: str, org_id: str) -> dict:
        """Reject a task phase, sending it back to the assignee."""
        update_data = {
            f"{phase_key}_status": "rejected",
            "status": "active",
        }
        return await self._repo.update_task(task_id, update_data)

    async def request_access(
        self, task_id: int, user_id: str, org_id: str,
        reason: str, task_title: str,
    ) -> dict:
        """Request access/review for a task."""
        update_data = {
            "access_requested_by": user_id,
            "access_request_reason": reason,
            "status": "access_requested",
        }
        return await self._repo.update_task(task_id, update_data)
