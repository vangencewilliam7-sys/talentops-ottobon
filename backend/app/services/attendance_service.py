"""
Attendance Service — Business logic for attendance management.
"""
from app.repositories.attendance_repository import AttendanceRepository


class AttendanceService:
    def __init__(self, repo: AttendanceRepository):
        self._repo = repo

    async def clock_in(self, user_id: str, org_id: str) -> dict:
        return await self._repo.clock_in(user_id, org_id)

    async def clock_out(self, user_id: str) -> dict:
        return await self._repo.clock_out(user_id)

    async def get_my_attendance(self, user_id: str, start_date: str, end_date: str) -> list[dict]:
        return await self._repo.get_attendance(user_id, start_date, end_date)

    async def get_team_attendance(self, org_id: str, target_date: str) -> list[dict]:
        return await self._repo.get_team_attendance(org_id, target_date)
