"""
Storage Repository — Data access layer for file storage.
Replaces services/storageService.js as pure Python.
Uses Supabase Storage (S3-compatible) via the Python client.
"""
import re
from datetime import datetime, timezone
from app.repositories.base import BaseRepository


class StorageRepository(BaseRepository):

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Remove characters that break S3/Supabase storage keys."""
        if not filename:
            return f"file_{int(datetime.now(timezone.utc).timestamp())}"
        cleaned = re.sub(r'[\[\]{}]', '', filename)   # Remove brackets
        cleaned = re.sub(r'\s+', '_', cleaned)          # Spaces → underscores
        return cleaned

    async def upload_file(self, bucket: str, path: str, file_bytes: bytes, filename: str, content_type: str) -> dict:
        """
        Upload a file to Supabase Storage.
        Returns: { public_url, file_name, storage_path }
        """
        clean_name = self.sanitize_filename(filename)
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        file_path = f"{path}/{timestamp}_{clean_name}" if path else f"{timestamp}_{clean_name}"

        self.db.storage.from_(bucket).upload(
            file_path,
            file_bytes,
            {"content-type": content_type, "cache-control": "3600"},
        )

        public_url = self.db.storage.from_(bucket).get_public_url(file_path)

        return {
            "public_url": public_url,
            "file_name": filename,
            "storage_path": file_path,
        }

    async def upload_multiple_files(
        self, bucket: str, path: str, files: list[tuple[bytes, str, str]]
    ) -> list[dict]:
        """
        Upload multiple files.
        files: list of (file_bytes, filename, content_type)
        """
        results = []
        for file_bytes, filename, content_type in files:
            result = await self.upload_file(bucket, path, file_bytes, filename, content_type)
            results.append({**result, "file_type": content_type})
        return results
