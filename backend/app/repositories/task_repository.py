"""
Task Repository — Data access layer for tasks and task steps.
Replaces services/modules/task/queries.js as pure Python.
"""
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError


class TaskRepository(BaseRepository):

    async def get_tasks(
        self, org_id: str, project_id: str | None = None,
        view_mode: str = "default", user_id: str | None = None,
        user_role: str | None = None
    ) -> list[dict]:
        """Fetch tasks with role-based filtering."""
        query = self.db.table("tasks").select("*, phase_validations")

        if user_role == "executive" or view_mode == "global_tasks":
            query = query.eq("org_id", org_id)
            if project_id:
                query = query.eq("project_id", project_id)
        else:
            if not project_id:
                return []
            query = query.eq("project_id", project_id).eq("org_id", org_id)
            if view_mode == "my_tasks" and user_id:
                query = query.eq("assigned_to", user_id)

        query = query.order("id", desc=True)
        response = query.execute()
        return response.data or []

    async def get_task_by_id(self, task_id: int) -> dict:
        """Fetch a single task by ID."""
        response = self.db.table("tasks").select("*").eq("id", task_id).maybe_single().execute()
        if not response.data:
            raise NotFoundError("Task", task_id)
        return response.data

    async def create_task(self, task_data: dict) -> dict:
        """Insert a new task."""
        response = self.db.table("tasks").insert(task_data).execute()
        return response.data[0]

    async def update_task(self, task_id: int, updates: dict) -> dict:
        """Update task fields."""
        response = self.db.table("tasks").update(updates).eq("id", task_id).execute()
        if not response.data:
            raise NotFoundError("Task", task_id)
        return response.data[0]

    async def delete_task(self, task_id: int) -> None:
        """Delete a task."""
        self.db.table("tasks").delete().eq("id", task_id).execute()

    # ── Task Steps ────────────────────────────────────────

    async def get_task_steps(self, task_id: int) -> list[dict]:
        """Fetch steps for a task, ordered by index."""
        response = self.db.table("task_steps").select("*").eq(
            "task_id", task_id
        ).order("order_index", desc=False).execute()
        return response.data or []

    async def create_task_step(self, step_data: dict) -> dict:
        """Insert a new task step."""
        response = self.db.table("task_steps").insert(step_data).execute()
        return response.data[0]

    async def update_task_step(self, step_id: int, updates: dict) -> dict:
        """Update a task step."""
        response = self.db.table("task_steps").update(updates).eq("id", step_id).execute()
        return response.data[0]

    async def delete_task_step(self, step_id: int) -> None:
        """Delete a task step."""
        self.db.table("task_steps").delete().eq("id", step_id).execute()

    # ── Task Assignees ────────────────────────────────────

    async def get_task_assignees(self, org_id: str, project_id: str | None = None) -> list[dict]:
        """Fetch potential assignees for task assignment."""
        if project_id:
            response = self.db.table("project_members").select(
                "user_id, role, profiles:user_id (id, full_name, email, role, avatar_url, technical_scores)"
            ).eq("project_id", project_id).eq("org_id", org_id).execute()

            members = response.data or []
            return [
                {
                    "id": m["profiles"]["id"],
                    "full_name": m["profiles"]["full_name"],
                    "email": m["profiles"]["email"],
                    "role": m.get("role") or m["profiles"]["role"],
                    "avatar_url": m["profiles"]["avatar_url"],
                    "technical_scores": m["profiles"].get("technical_scores", {}),
                }
                for m in members if m.get("profiles")
            ]
        else:
            response = self.db.table("profiles").select(
                "id, full_name, email, role, avatar_url, technical_scores"
            ).eq("org_id", org_id).execute()
            return response.data or []

    # ── Risk Snapshots ────────────────────────────────────

    async def get_latest_risk_snapshot(self, task_id: int) -> dict | None:
        """Fetch the most recent risk snapshot for a task."""
        response = self.db.table("task_risk_snapshots").select("*").eq(
            "task_id", task_id
        ).order("computed_at", desc=True).limit(1).maybe_single().execute()
        return response.data

    async def insert_risk_snapshot(self, snapshot: dict) -> dict:
        """Insert a risk analysis snapshot."""
        response = self.db.table("task_risk_snapshots").insert(snapshot).execute()
        return response.data[0]

    async def get_similar_task_context(self, skill_tags: list[str], limit: int = 3) -> list[dict]:
        """Fetch similar past tasks for AI context (replaces rpc_get_similar_task_context)."""
        query = self.db.table("tasks").select("title, skill_tags")
        if skill_tags:
            query = query.overlaps("skill_tags", skill_tags)
        query = query.limit(limit)
        response = query.execute()
        return response.data or []
