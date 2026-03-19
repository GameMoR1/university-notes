"""Comments API."""
from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Note, Comment, User, ActivityLog
from app.schemas.schemas import CommentCreate, CommentOut, MessageResponse
from app.api.deps import get_current_user

router = APIRouter(tags=["comments"])


def _comment_tree_options() -> Tuple:
    """
    Жадная загрузка дерева ответов + авторы (без implicit lazy в async).
    До 4 уровней вложенности ответов.
    """
    return (
        selectinload(Comment.author),
        selectinload(Comment.replies).options(
            selectinload(Comment.author),
            selectinload(Comment.replies).options(
                selectinload(Comment.author),
                selectinload(Comment.replies).options(
                    selectinload(Comment.author),
                    selectinload(Comment.replies).selectinload(Comment.author),
                ),
            ),
        ),
    )


async def _load_comment_for_response(db: AsyncSession, comment_id: int) -> Comment:
    result = await db.execute(
        select(Comment)
        .options(*_comment_tree_options())
        .where(Comment.id == comment_id)
    )
    return result.scalar_one()


@router.get("/notes/{note_id}/comments", response_model=List[CommentOut])
async def get_comments(note_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment)
        .options(*_comment_tree_options())
        .where(Comment.note_id == note_id, Comment.parent_id.is_(None))
        .order_by(Comment.created_at)
    )
    return result.scalars().all()


@router.post("/notes/{note_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(
    note_id: int,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or not current_user.role.can_comment:
        raise HTTPException(403, "Нет прав для комментирования")

    note_result = await db.execute(select(Note).where(Note.id == note_id))
    note = note_result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Заметка не найдена")

    if data.parent_id is not None:
        parent_result = await db.execute(
            select(Comment).where(Comment.id == data.parent_id, Comment.note_id == note_id)
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(400, "Родительский комментарий не найден или от другой заметки")

    comment = Comment(
        content=data.content,
        note_id=note_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
    )
    db.add(comment)
    await db.flush()

    log = ActivityLog(user_id=current_user.id, action="add_comment", entity_type="note", entity_id=note_id)
    db.add(log)
    await db.commit()

    return await _load_comment_for_response(db, comment.id)


@router.put("/comments/{comment_id}", response_model=CommentOut)
async def update_comment(
    comment_id: int,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(404, "Комментарий не найден")
    if comment.author_id != current_user.id and not (
        current_user.role and current_user.role.can_manage_users
    ):
        raise HTTPException(403, "Нет прав")
    comment.content = data.content
    await db.commit()

    return await _load_comment_for_response(db, comment_id)


@router.delete("/comments/{comment_id}", response_model=MessageResponse)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(404, "Комментарий не найден")
    if comment.author_id != current_user.id and not (
        current_user.role and current_user.role.can_manage_users
    ):
        raise HTTPException(403, "Нет прав")
    await db.delete(comment)
    await db.commit()
    return {"message": "Комментарий удалён"}


@router.post("/comments/{comment_id}/mark-answer", response_model=CommentOut)
async def mark_as_answer(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(404, "Комментарий не найден")
    if not current_user.role or (
        not current_user.role.can_create_notes and not current_user.role.can_manage_users
    ):
        raise HTTPException(403, "Только преподаватель может отмечать ответы")
    comment.is_answer = not comment.is_answer
    await db.commit()

    return await _load_comment_for_response(db, comment_id)
