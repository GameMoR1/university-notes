"""Notes API — CRUD + поиск + связи."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Note, Tag, User, ActivityLog, note_tags, note_links, Comment
from app.schemas.schemas import (
    NoteCreate, NoteUpdate, NoteOut, NoteShort, PaginatedNotes, MessageResponse
)
from app.api.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/notes", tags=["notes"])


def _load_note():
    return selectinload(Note.author), selectinload(Note.tags), selectinload(Note.linked_notes), selectinload(Note.comments).selectinload(Comment.author)


@router.get("", response_model=PaginatedNotes)
async def list_notes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    author_id: Optional[int] = Query(None),
    published_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = select(Note).options(*_load_note())

    # Права доступа
    if not current_user:
        query = query.where(Note.is_published == True)
    elif current_user.role.name == "student":
        query = query.where(Note.is_published == True)
    elif not current_user.role.can_manage_users and not current_user.role.can_create_notes:
        query = query.where(Note.is_published == True)

    if published_only and current_user and current_user.role.can_create_notes:
        pass  # Преподаватели видят всё
    elif published_only:
        query = query.where(Note.is_published == True)

    if search:
        query = query.where(
            or_(Note.title.ilike(f"%{search}%"), Note.content.ilike(f"%{search}%"))
        )
    if author_id:
        query = query.where(Note.author_id == author_id)
    if tag:
        query = query.join(Note.tags).where(Tag.name == tag)

    # Считаем уникальные заметки (при JOIN по тегам строки дублируются — обычный count был бы завышен)
    count_subq = query.with_only_columns(Note.id).distinct().subquery()
    count_q = select(func.count()).select_from(count_subq)
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    query = query.order_by(Note.updated_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    notes = result.scalars().unique().all()

    # Число комментариев по заметкам (для карточек списка)
    comments_map: dict[int, int] = {}
    if notes:
        nid_list = [n.id for n in notes]
        cc_rows = (
            await db.execute(
                select(Comment.note_id, func.count(Comment.id))
                .where(Comment.note_id.in_(nid_list))
                .group_by(Comment.note_id)
            )
        ).all()
        comments_map = {int(r[0]): int(r[1]) for r in cc_rows}

    items = [
        NoteShort.model_validate(n).model_copy(
            update={"comments_count": comments_map.get(n.id, 0)}
        )
        for n in notes
    ]

    return PaginatedNotes(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, (total + per_page - 1) // per_page),
    )


@router.post("", response_model=NoteOut, status_code=201)
async def create_note(
    data: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or not current_user.role.can_create_notes:
        raise HTTPException(403, "Нет прав для создания заметок")

    note = Note(
        title=data.title,
        content=data.content,
        is_published=data.is_published,
        author_id=current_user.id,
    )
    db.add(note)
    await db.flush()

    # В async-сессии нельзя присваивать M2M без предзагрузки — иначе lazy-load → MissingGreenlet.
    _m2m_attrs: List[str] = []
    if data.tag_ids:
        _m2m_attrs.append("tags")
    if data.linked_note_ids:
        _m2m_attrs.append("linked_notes")
    if _m2m_attrs:
        await db.refresh(note, attribute_names=_m2m_attrs)

    # Теги
    if data.tag_ids:
        tags = (await db.execute(select(Tag).where(Tag.id.in_(data.tag_ids)))).scalars().all()
        note.tags = list(tags)

    # Связи
    if data.linked_note_ids:
        linked = (await db.execute(select(Note).where(Note.id.in_(data.linked_note_ids)))).scalars().all()
        note.linked_notes = list(linked)

    log = ActivityLog(user_id=current_user.id, action="create_note", entity_type="note", entity_id=note.id, details=note.title)
    db.add(log)
    await db.commit()

    result = await db.execute(select(Note).options(*_load_note()).where(Note.id == note.id))
    return result.scalar_one()


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(Note).options(*_load_note()).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Заметка не найдена")

    # Права
    if not note.is_published:
        if not current_user:
            raise HTTPException(403, "Доступ запрещён")
        if not current_user.role.can_create_notes and not current_user.role.can_manage_users:
            if note.author_id != current_user.id:
                raise HTTPException(403, "Доступ запрещён")

    # Инкремент просмотров
    note.views_count = (note.views_count or 0) + 1
    await db.commit()
    await db.refresh(note)

    result2 = await db.execute(select(Note).options(*_load_note()).where(Note.id == note_id))
    return result2.scalar_one()


@router.put("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Note).options(*_load_note()).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Заметка не найдена")

    # Права
    is_own = note.author_id == current_user.id
    can_edit = current_user.role.can_edit_notes or is_own
    if not can_edit:
        raise HTTPException(403, "Нет прав для редактирования")

    if data.title is not None:
        note.title = data.title
    if data.content is not None:
        note.content = data.content
    if data.is_published is not None:
        if not current_user.role.can_publish_notes and not current_user.role.can_manage_users:
            raise HTTPException(403, "Нет прав для публикации")
        note.is_published = data.is_published
    if data.tag_ids is not None:
        tags = (await db.execute(select(Tag).where(Tag.id.in_(data.tag_ids)))).scalars().all()
        note.tags = list(tags)
    if data.linked_note_ids is not None:
        linked = (await db.execute(select(Note).where(Note.id.in_(data.linked_note_ids)))).scalars().all()
        note.linked_notes = list(linked)

    log = ActivityLog(user_id=current_user.id, action="update_note", entity_type="note", entity_id=note.id)
    db.add(log)
    await db.commit()

    result2 = await db.execute(select(Note).options(*_load_note()).where(Note.id == note_id))
    return result2.scalar_one()


@router.delete("/{note_id}", response_model=MessageResponse)
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Заметка не найдена")

    is_own = note.author_id == current_user.id
    if not current_user.role.can_delete_notes and not is_own and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав для удаления")

    log = ActivityLog(user_id=current_user.id, action="delete_note", entity_type="note", entity_id=note_id, details=note.title)
    db.add(log)
    await db.delete(note)
    await db.commit()
    return {"message": "Заметка удалена"}


@router.post("/{note_id}/publish", response_model=NoteOut)
async def toggle_publish(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Note).options(*_load_note()).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Заметка не найдена")

    if not current_user.role.can_publish_notes and not current_user.role.can_manage_users:
        if note.author_id != current_user.id:
            raise HTTPException(403, "Нет прав для публикации")

    note.is_published = not note.is_published
    log = ActivityLog(
        user_id=current_user.id,
        action="publish_note" if note.is_published else "unpublish_note",
        entity_type="note", entity_id=note_id
    )
    db.add(log)
    await db.commit()

    result2 = await db.execute(select(Note).options(*_load_note()).where(Note.id == note_id))
    return result2.scalar_one()
