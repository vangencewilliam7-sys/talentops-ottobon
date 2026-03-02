"""
Storage Service — Business logic for file uploads.
"""
from app.repositories.storage_repository import StorageRepository


class StorageService:
    def __init__(self, repo: StorageRepository):
        self._repo = repo

    async def upload_file(
        self, bucket: str, path: str, file_bytes: bytes, filename: str, content_type: str,
    ) -> dict:
        return await self._repo.upload_file(bucket, path, file_bytes, filename, content_type)

    async def upload_multiple(
        self, bucket: str, path: str, files: list[tuple[bytes, str, str]],
    ) -> list[dict]:
        return await self._repo.upload_multiple_files(bucket, path, files)
