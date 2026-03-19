"""
Ручная проверка запроса заметок (запуск: python debug_graph_query.py из каталога backend).
Не pytest-тест — не переименовывать в test_*.py без маркеров asyncio.
"""
import asyncio

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.models import Note, Comment


async def main() -> None:
    async with AsyncSessionLocal() as db:
        q = (
            select(Note)
            .options(
                selectinload(Note.tags),
                selectinload(Note.linked_notes),
                selectinload(Note.comments).selectinload(Comment.author),
            )
            .where(Note.is_published.is_(True))
        )
        res = await db.execute(q)
        notes = res.scalars().unique().all()
        print("FOUND PUBLISHED:", len(notes))
    async with AsyncSessionLocal() as db:
        q = select(Note)
        res = await db.execute(q)
        print("ALL:", len(res.scalars().all()))


if __name__ == "__main__":
    asyncio.run(main())
