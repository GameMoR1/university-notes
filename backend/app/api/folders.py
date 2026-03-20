"""Folders API — CRUD для папок."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Folder, User, ActivityLog, Note
from app.schemas.schemas import FolderCreate, FolderUpdate, FolderOut, MessageResponse
from app.api.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=List[FolderOut])
async def list_folders(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Список всех папок. Доступен всем."""
    result = await db.execute(select(Folder))
    return result.scalars().all()


@router.post("", response_model=FolderOut, status_code=201)
async def create_folder(
    data: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or not current_user.role.can_create_notes:
        raise HTTPException(403, "Нет прав для создания папок")

    folder = Folder(name=data.name, user_id=current_user.id)
    db.add(folder)
    await db.flush()
    
    log = ActivityLog(user_id=current_user.id, action="create_folder", entity_type="folder", entity_id=folder.id, details=folder.name)
    db.add(log)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.put("/{folder_id}", response_model=FolderOut)
async def update_folder(
    folder_id: int,
    data: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(404, "Папка не найдена")
    
    if folder.user_id != current_user.id and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав доступа")

    if data.name is not None:
        folder.name = data.name
    if data.is_favorite is not None:
        folder.is_favorite = data.is_favorite
        
    await db.commit()
    await db.refresh(folder)
    return folder


@router.patch("/{folder_id}/toggle-favorite", response_model=FolderOut)
async def toggle_folder_favorite(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(404, "Папка не найдена")
    
    if folder.user_id != current_user.id and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав доступа")

    folder.is_favorite = not folder.is_favorite
    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/{folder_id}", response_model=MessageResponse)
async def delete_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(404, "Папка не найдена")
    
    if folder.user_id != current_user.id and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав доступа")

    await db.delete(folder)
    await db.commit()
    return {"message": "Папка удалена"}
