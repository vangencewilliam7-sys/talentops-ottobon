"""
Payroll Repository — Data access layer for payroll.
Replaces rpc_generate_monthly_payroll, rpc_complete_payroll, rpc_get_payroll_history as pure Python.
"""
from app.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError


class PayrollRepository(BaseRepository):

    async def get_payroll_history(self, org_id: str, month: str | None = None) -> list[dict]:
        """Fetch payroll records for an org, optionally filtered by month."""
        query = self.db.table("payroll").select(
            "*, profiles:user_id (id, full_name, email, role, department)"
        ).eq("org_id", org_id)

        if month:
            query = query.eq("month", month)

        query = query.order("created_at", desc=True)
        response = query.execute()
        return response.data or []

    async def get_user_payroll_history(self, user_id: str) -> list[dict]:
        """Fetch payroll history for a specific user."""
        response = self.db.table("payroll").select("*").eq(
            "user_id", user_id
        ).order("month", desc=True).execute()
        return response.data or []

    async def create_payroll_record(self, record: dict) -> dict:
        """Insert a payroll record."""
        response = self.db.table("payroll").insert(record).execute()
        return response.data[0]

    async def create_payroll_batch(self, records: list[dict]) -> list[dict]:
        """Insert multiple payroll records at once."""
        response = self.db.table("payroll").insert(records).execute()
        return response.data or []

    async def update_payroll_status(self, payroll_id: int, status: str, updates: dict = None) -> dict:
        """Update payroll record status (e.g., generated → completed)."""
        data = {"status": status}
        if updates:
            data.update(updates)
        response = self.db.table("payroll").update(data).eq("id", payroll_id).execute()
        if not response.data:
            raise NotFoundError("PayrollRecord", payroll_id)
        return response.data[0]

    async def get_org_salary_config(self, org_id: str) -> list[dict]:
        """Fetch salary configurations for an organization's employees."""
        response = self.db.table("profiles").select(
            "id, full_name, role, department, salary, deductions"
        ).eq("org_id", org_id).execute()
        return response.data or []
