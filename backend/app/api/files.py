"""Files API: upload, download, preview, delete."""
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FileForm, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import io, mimetypes

from app.core.database import get_db
from app.core.minio_client import file_storage
from app.models.models import File, Note, ActivityLog, User
from app.schemas.schemas import FileOut, FileUploadResponse, MessageResponse
from app.api.deps import get_current_user, get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(tags=["files"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_TYPES = [
    "image/", "text/", "application/pdf", "application/json",
    "application/msword", "application/vnd.openxmlformats-officedocument",
    "video/", "audio/",
]


@router.get("/notes/{note_id}/files", response_model=list[FileOut])
async def list_note_files(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user_optional),
):
    result = await db.execute(
        select(File).where(File.note_id == note_id).order_by(File.created_at.desc())
    )
    return result.scalars().all()


@router.post("/notes/{note_id}/files", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    note_id: int,
    file: UploadFile = FileForm(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Проверка заметки
    note_result = await db.execute(select(Note).where(Note.id == note_id))
    note = note_result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Заметка не найдена")

    # Проверка прав
    if note.author_id != current_user.id and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав для загрузки файлов в эту заметку")

    # Проверка размера
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Файл слишком большой (макс. {MAX_FILE_SIZE // 1024 // 1024} MB)")

    mime_type = file.content_type or "application/octet-stream"
    original_name = file.filename or "file"

    # Сохраняем в хранилище
    stored_path = await file_storage.upload(note_id, original_name, data, mime_type)

    # Запись в БД
    db_file = File(
        original_name=original_name,
        stored_path=stored_path,
        mime_type=mime_type,
        file_size=len(data),
        note_id=note_id,
        author_id=current_user.id,
    )
    db.add(db_file)

    log = ActivityLog(
        user_id=current_user.id,
        action="upload_file",
        entity_type="file",
        entity_id=db_file.id,
        details=f"{original_name} ({len(data)} bytes)",
    )
    db.add(log)
    await db.commit()
    await db.refresh(db_file)

    return FileUploadResponse(
        id=db_file.id,
        original_name=original_name,
        mime_type=mime_type,
        file_size=len(data),
    )


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user_optional),
):
    result = await db.execute(select(File).where(File.id == file_id))
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(404, "Файл не найден")

    data = await file_storage.download(db_file.stored_path)
    if data is None:
        raise HTTPException(404, "Файл не найден в хранилище")

    return Response(
        content=data,
        media_type=db_file.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{db_file.original_name}"',
            "Content-Length": str(len(data)),
        },
    )


@router.get("/files/{file_id}/preview")
async def preview_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user_optional),
):
    result = await db.execute(select(File).where(File.id == file_id))
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(404, "Файл не найден")

    data = await file_storage.download(db_file.stored_path)
    if data is None:
        raise HTTPException(404, "Файл не найден в хранилище")

    mime = db_file.mime_type
    # Для PDF и изображений показываем inline
    if mime.startswith("image/") or mime == "application/pdf":
        disposition = "inline"
    else:
        disposition = "attachment"

    return Response(
        content=data,
        media_type=mime,
        headers={
            "Content-Disposition": f'{disposition}; filename="{db_file.original_name}"',
            "Content-Length": str(len(data)),
        },
    )


@router.delete("/files/{file_id}", response_model=MessageResponse)
async def delete_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(File).where(File.id == file_id))
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(404, "Файл не найден")

    # Проверка прав
    if db_file.author_id != current_user.id and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав для удаления")

    await file_storage.delete(db_file.stored_path)
    await db.delete(db_file)

    log = ActivityLog(
        user_id=current_user.id,
        action="delete_file",
        entity_type="file",
        entity_id=file_id,
        details=db_file.original_name,
    )
    db.add(log)
    await db.commit()

    return {"message": "Файл удалён"}
