"""
Storage routes — /api/storage
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form

from app.core.security import get_current_user, CurrentUser
from app.core.dependencies import get_storage_service
from app.core.exceptions import exception_to_http, TalentOpsException
from app.services.storage_service import StorageService

router = APIRouter(prefix="/api/storage", tags=["storage"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    bucket: str = Form("task-attachments"),
    path: str = Form(""),
    current_user: CurrentUser = Depends(get_current_user),
    service: StorageService = Depends(get_storage_service),
):
    try:
        content = await file.read()
        return await service.upload_file(
            bucket, path, content, file.filename, file.content_type,
        )
    except TalentOpsException as e:
        raise exception_to_http(e)


@router.post("/upload-multiple")
async def upload_multiple(
    files: list[UploadFile] = File(...),
    bucket: str = Form("task-attachments"),
    path: str = Form(""),
    current_user: CurrentUser = Depends(get_current_user),
    service: StorageService = Depends(get_storage_service),
):
    try:
        file_data = []
        for f in files:
            content = await f.read()
            file_data.append((content, f.filename, f.content_type))
        return await service.upload_multiple(bucket, path, file_data)
    except TalentOpsException as e:
        raise exception_to_http(e)
