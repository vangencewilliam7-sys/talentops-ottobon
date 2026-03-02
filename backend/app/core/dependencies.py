"""
TalentOps Backend — Dependency Injection Container
FastAPI Depends() wiring for repositories and services.
Follows the Dependency Inversion Principle.
"""
from fastapi import Depends
from supabase import Client

from app.db.supabase_client import get_supabase_client

# ── Repositories ──────────────────────────────────────────
from app.repositories.profile_repository import ProfileRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.storage_repository import StorageRepository
from app.repositories.attendance_repository import AttendanceRepository
from app.repositories.payroll_repository import PayrollRepository
from app.repositories.leave_repository import LeaveRepository
from app.repositories.announcement_repository import AnnouncementRepository

# ── Services ──────────────────────────────────────────────
from app.services.profile_service import ProfileService
from app.services.task_service import TaskService
from app.services.messaging_service import MessagingService
from app.services.notification_service import NotificationService
from app.services.storage_service import StorageService
from app.services.attendance_service import AttendanceService
from app.services.payroll_service import PayrollService
from app.services.leave_service import LeaveService
from app.services.announcement_service import AnnouncementService
from app.services.ai_service import AIService


# ── Repository Providers ──────────────────────────────────

def get_profile_repository(db: Client = Depends(get_supabase_client)) -> ProfileRepository:
    return ProfileRepository(db)

def get_task_repository(db: Client = Depends(get_supabase_client)) -> TaskRepository:
    return TaskRepository(db)

def get_message_repository(db: Client = Depends(get_supabase_client)) -> MessageRepository:
    return MessageRepository(db)

def get_notification_repository(db: Client = Depends(get_supabase_client)) -> NotificationRepository:
    return NotificationRepository(db)

def get_storage_repository(db: Client = Depends(get_supabase_client)) -> StorageRepository:
    return StorageRepository(db)

def get_attendance_repository(db: Client = Depends(get_supabase_client)) -> AttendanceRepository:
    return AttendanceRepository(db)

def get_payroll_repository(db: Client = Depends(get_supabase_client)) -> PayrollRepository:
    return PayrollRepository(db)

def get_leave_repository(db: Client = Depends(get_supabase_client)) -> LeaveRepository:
    return LeaveRepository(db)

def get_announcement_repository(db: Client = Depends(get_supabase_client)) -> AnnouncementRepository:
    return AnnouncementRepository(db)


# ── Service Providers ─────────────────────────────────────

def get_profile_service(repo: ProfileRepository = Depends(get_profile_repository)) -> ProfileService:
    return ProfileService(repo)

def get_task_service(
    repo: TaskRepository = Depends(get_task_repository),
    notification_repo: NotificationRepository = Depends(get_notification_repository),
    storage_repo: StorageRepository = Depends(get_storage_repository),
) -> TaskService:
    return TaskService(repo, notification_repo, storage_repo)

def get_messaging_service(
    repo: MessageRepository = Depends(get_message_repository),
    notification_repo: NotificationRepository = Depends(get_notification_repository),
) -> MessagingService:
    return MessagingService(repo, notification_repo)

def get_notification_service(repo: NotificationRepository = Depends(get_notification_repository)) -> NotificationService:
    return NotificationService(repo)

def get_storage_service(repo: StorageRepository = Depends(get_storage_repository)) -> StorageService:
    return StorageService(repo)

def get_attendance_service(repo: AttendanceRepository = Depends(get_attendance_repository)) -> AttendanceService:
    return AttendanceService(repo)

def get_payroll_service(repo: PayrollRepository = Depends(get_payroll_repository)) -> PayrollService:
    return PayrollService(repo)

def get_leave_service(
    repo: LeaveRepository = Depends(get_leave_repository),
    notification_repo: NotificationRepository = Depends(get_notification_repository),
) -> LeaveService:
    return LeaveService(repo, notification_repo)

def get_announcement_service(
    repo: AnnouncementRepository = Depends(get_announcement_repository),
    notification_repo: NotificationRepository = Depends(get_notification_repository),
) -> AnnouncementService:
    return AnnouncementService(repo, notification_repo)

def get_ai_service(
    task_repo: TaskRepository = Depends(get_task_repository),
) -> AIService:
    return AIService(task_repo)
