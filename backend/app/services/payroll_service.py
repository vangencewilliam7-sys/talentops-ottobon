"""
Payroll Service — Business logic for payroll.
Replaces utils/payrollCalculations.js as pure Python.
"""
from app.repositories.payroll_repository import PayrollRepository
from app.core.exceptions import ValidationError


class PayrollService:
    def __init__(self, repo: PayrollRepository):
        self._repo = repo

    async def generate_monthly_payroll(self, org_id: str, month: str) -> list[dict]:
        """
        Generate payroll for all employees in an organization for a given month.
        Calculates gross salary, deductions, and net pay.
        """
        employees = await self._repo.get_org_salary_config(org_id)

        if not employees:
            raise ValidationError("No employees found in this organization")

        payroll_records = []
        for emp in employees:
            base_salary = emp.get("salary", 0) or 0
            deductions_config = emp.get("deductions", {}) or {}

            # Calculate deductions
            pf = deductions_config.get("pf", 0)
            tax = deductions_config.get("tax", 0)
            other = deductions_config.get("other", 0)
            total_deductions = pf + tax + other

            net_pay = base_salary - total_deductions

            payroll_records.append({
                "user_id": emp["id"],
                "org_id": org_id,
                "month": month,
                "base_salary": base_salary,
                "pf_deduction": pf,
                "tax_deduction": tax,
                "other_deductions": other,
                "total_deductions": total_deductions,
                "net_pay": max(net_pay, 0),
                "status": "generated",
            })

        results = await self._repo.create_payroll_batch(payroll_records)
        return results

    async def complete_payroll(self, payroll_id: int) -> dict:
        """Mark a payroll record as completed (paid)."""
        return await self._repo.update_payroll_status(payroll_id, "completed")

    async def get_org_payroll_history(self, org_id: str, month: str | None = None) -> list[dict]:
        return await self._repo.get_payroll_history(org_id, month)

    async def get_my_payroll_history(self, user_id: str) -> list[dict]:
        return await self._repo.get_user_payroll_history(user_id)
