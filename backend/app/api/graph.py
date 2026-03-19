"""Graph API — данные для 3D-графа."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Note, User
from app.schemas.schemas import GraphData, GraphNode, GraphEdge, TagOut, GraphLinkCreate
from app.api.deps import get_current_user_optional, get_current_user

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=GraphData)
async def get_graph(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    # Определяем доступные заметки
    if current_user and (current_user.role.can_create_notes or current_user.role.can_manage_users):
        notes_q = select(Note).options(selectinload(Note.tags), selectinload(Note.linked_notes), selectinload(Note.comments))
    else:
        notes_q = select(Note).options(selectinload(Note.tags), selectinload(Note.linked_notes), selectinload(Note.comments)).where(Note.is_published == True)

    result = await db.execute(notes_q)
    notes = result.scalars().unique().all()

    note_ids = {n.id for n in notes}

    nodes = []
    edges = []

    for note in notes:
        nodes.append(GraphNode(
            id=note.id,
            title=note.title,
            tags=[TagOut(id=t.id, name=t.name, color=t.color) for t in note.tags],
            is_published=note.is_published,
            views_count=note.views_count,
            links_count=len(note.linked_notes),
            comments_count=len(note.comments)
        ))
        for linked in note.linked_notes:
            if linked.id in note_ids:
                edges.append(GraphEdge(source=note.id, target=linked.id))

    return GraphData(nodes=nodes, edges=edges)

@router.post("/link", response_model=dict)
async def add_link(
    data: GraphLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role.can_edit_notes and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав для изменения связей")
    
    # Verify notes exist
    result = await db.execute(select(Note).options(selectinload(Note.linked_notes)).where(Note.id.in_([data.source_id, data.target_id])))
    notes = {n.id: n for n in result.scalars().all()}
    
    if data.source_id not in notes or data.target_id not in notes:
        raise HTTPException(404, "Заметки не найдены")
        
    s_note = notes[data.source_id]
    t_note = notes[data.target_id]
    
    if t_note not in s_note.linked_notes:
        s_note.linked_notes.append(t_note)
        
    await db.commit()
    return {"message": "Связь создана"}

@router.delete("/link", response_model=dict)
async def remove_link(
    data: GraphLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role.can_edit_notes and not current_user.role.can_manage_users:
        raise HTTPException(403, "Нет прав для изменения связей")
        
    result = await db.execute(select(Note).options(selectinload(Note.linked_notes)).where(Note.id == data.source_id))
    s_note = result.scalar_one_or_none()
    
    if not s_note:
        raise HTTPException(404, "Исходная заметка не найдена")
        
    s_note.linked_notes = [n for n in s_note.linked_notes if n.id != data.target_id]
    await db.commit()
    return {"message": "Связь удалена"}
