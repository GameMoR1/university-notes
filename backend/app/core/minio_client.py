"""MinIO / Local filesystem client for file storage."""
import io
import uuid
import logging
from pathlib import Path
from typing import BinaryIO, Optional
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger(__name__)


class FileStorage:
    """Абстракция над MinIO или локальной файловой системой."""

    def __init__(self):
        self._client: Optional[Minio] = None
        self._local_path = Path(settings.MINIO_LOCAL_PATH)
        self._bucket = settings.MINIO_BUCKET
        self._use_minio = True

        if self._use_minio:
            try:
                self._client = Minio(
                    settings.MINIO_ENDPOINT,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=settings.MINIO_SECURE,
                )
                if not self._client.bucket_exists(self._bucket):
                    self._client.make_bucket(self._bucket)
                logger.info("MinIO подключён: %s / %s", settings.MINIO_ENDPOINT, self._bucket)
            except Exception as e:
                logger.warning("MinIO недоступен (%s), переключаюсь на локальное хранение", e)
                self._use_minio = False

        if not self._use_minio:
            self._local_path.mkdir(parents=True, exist_ok=True)
            logger.info("Файлы будут храниться локально: %s", self._local_path)

    def generate_path(self, note_id: int, original_name: str) -> str:
        ext = Path(original_name).suffix
        return f"{note_id}/{uuid.uuid4().hex}{ext}"

    async def upload(self, note_id: int, original_name: str, data: bytes, content_type: str) -> str:
        file_path = self.generate_path(note_id, original_name)
        if self._use_minio and self._client:
            try:
                self._client.put_object(
                    self._bucket,
                    file_path,
                    io.BytesIO(data),
                    length=len(data),
                    content_type=content_type,
                )
                logger.info("Файл загружен в MinIO: %s", file_path)
            except S3Error as e:
                logger.error("Ошибка MinIO: %s", e)
                raise
        else:
            full_path = self._local_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_bytes(data)
            logger.info("Файл сохранён локально: %s", full_path)
        return file_path

    async def download(self, file_path: str) -> Optional[bytes]:
        if self._use_minio and self._client:
            try:
                response = self._client.get_object(self._bucket, file_path)
                data = response.read()
                response.close()
                return data
            except S3Error:
                logger.error("Файл не найден в MinIO: %s", file_path)
                return None
        else:
            full_path = self._local_path / file_path
            if not full_path.exists():
                return None
            return full_path.read_bytes()

    async def delete(self, file_path: str) -> bool:
        if self._use_minio and self._client:
            try:
                self._client.remove_object(self._bucket, file_path)
                return True
            except S3Error:
                return False
        else:
            full_path = self._local_path / file_path
            if full_path.exists():
                full_path.unlink()
                return True
            return False

    async def get_total_size(self) -> int:
        total = 0
        if self._use_minio and self._client:
            try:
                objects = self._client.list_objects(self._bucket, recursive=True)
                for obj in objects:
                    total += obj.size
            except S3Error:
                logger.warning("Не удалось получить размер хранилища MinIO")
        else:
            for f in self._local_path.rglob("*"):
                if f.is_file():
                    total += f.stat().st_size
        return total

    async def get_metadata(self, file_path: str) -> Optional[dict]:
        if self._use_minio and self._client:
            try:
                stat = self._client.stat_object(self._bucket, file_path)
                return {
                    "size": stat.size,
                    "content_type": stat.content_type,
                    "last_modified": stat.last_modified,
                }
            except S3Error:
                return None
        else:
            full_path = self._local_path / file_path
            if not full_path.exists():
                return None
            import mimetypes
            return {
                "size": full_path.stat().st_size,
                "content_type": mimetypes.guess_type(full_path.name)[0] or "application/octet-stream",
                "last_modified": full_path.stat().st_mtime,
            }


file_storage = FileStorage()
