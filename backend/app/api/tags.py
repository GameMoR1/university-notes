"""Tags API."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Tag, User
from app.schemas.schemas import TagOut, TagCreate, MessageResponse
from app.api.deps import get_current_user, require_teacher

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=List[TagOut])
async def list_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.name))
    return result.scalars().all()


@router.post("", response_model=TagOut, status_code=201)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_teacher),
):
    existing = await db.execute(select(Tag).where(Tag.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Тег уже существует")
    tag = Tag(name=data.name, color=data.color)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagOut)
async def update_tag(
    tag_id: int,
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_teacher),
):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(404, "Тег не найден")
    tag.name = data.name
    tag.color = data.color
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", response_model=MessageResponse)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_teacher),
):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(404, "Тег не найден")
    await db.delete(tag)
    await db.commit()
    return {"message": "Тег удалён"}
