"""
Notification routes — /api/notifications
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_notification_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.notification_service import NotificationService
from app.models.common import NotificationCreate, BulkNotificationCreate

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_my_notifications(
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return await service.get_my_notifications(current_user.id)
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("")
async def send_notification(
    body: NotificationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return await service.send_notification(
            body.receiver_id, current_user.id,
            current_user.email or "System", body.message, body.type,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/bulk")
async def send_bulk_notifications(
    body: BulkNotificationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return await service.send_bulk_notifications(
            body.receiver_ids, current_user.id,
            current_user.email or "System", body.message, body.type,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        await service.mark_read(notification_id)
        return {"status": "read"}
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.patch("/read-all")
async def mark_all_read(
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        await service.mark_all_read(current_user.id)
        return {"status": "all_read"}
    except TalentOpsException as e:
        raise exception_to_http(e)
