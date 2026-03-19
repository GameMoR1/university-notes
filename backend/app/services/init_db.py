"""
Инициализация БД и создание начальных данных (роли + admin).
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.models import Role, User
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


async def _ensure_demo_user(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
    role_name: str,
) -> None:
    """Создать пользователя, если ещё нет (идемпотентно)."""
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        return
    role_res = await db.execute(select(Role).where(Role.name == role_name))
    role = role_res.scalar_one_or_none()
    if not role:
        logger.warning("Роль %s не найдена, пропуск создания %s", role_name, email)
        return
    db.add(
        User(
            email=email,
            name=name,
            hashed_password=get_password_hash(password),
            role_id=role.id,
        )
    )
    await db.commit()
    logger.info("Создан демо-пользователь: %s (%s)", email, role_name)


ROLES_DEFAULTS = [
    {
        "name": "admin",
        "description": "Администратор системы",
        "can_create_notes": True,
        "can_edit_notes": True,
        "can_delete_notes": True,
        "can_publish_notes": True,
        "can_manage_users": True,
        "can_comment": True,
    },
    {
        "name": "teacher",
        "description": "Преподаватель",
        "can_create_notes": True,
        "can_edit_notes": True,
        "can_delete_notes": True,
        "can_publish_notes": True,
        "can_manage_users": False,
        "can_comment": True,
    },
    {
        "name": "student",
        "description": "Студент",
        "can_create_notes": False,
        "can_edit_notes": False,
        "can_delete_notes": False,
        "can_publish_notes": False,
        "can_manage_users": False,
        "can_comment": True,
    },
]


async def init_db():
    """Создать таблицы и наполнить начальными данными."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Создаём роли
        for role_data in ROLES_DEFAULTS:
            result = await db.execute(select(Role).where(Role.name == role_data["name"]))
            if not result.scalar_one_or_none():
                db.add(Role(**role_data))
                logger.info(f"Роль создана: {role_data['name']}")

        await db.commit()

        # Создаём admin-пользователя
        admin_result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        if not admin_result.scalar_one_or_none():
            admin_role_result = await db.execute(select(Role).where(Role.name == "admin"))
            admin_role = admin_role_result.scalar_one_or_none()
            if admin_role:
                admin = User(
                    email=settings.ADMIN_EMAIL,
                    name=settings.ADMIN_NAME,
                    hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                    role_id=admin_role.id,
                )
                db.add(admin)
                await db.commit()
                logger.info(f"Администратор создан: {settings.ADMIN_EMAIL}")

        # Демо преподаватель и студент (только TEST — для входа с разных ролей)
        if settings.TEST:
            await _ensure_demo_user(
                db,
                email=settings.TEACHER_EMAIL,
                password=settings.TEACHER_PASSWORD,
                name=settings.TEACHER_NAME,
                role_name="teacher",
            )
            await _ensure_demo_user(
                db,
                email=settings.STUDENT_EMAIL,
                password=settings.STUDENT_PASSWORD,
                name=settings.STUDENT_NAME,
                role_name="student",
            )

        # Создаём тестовые данные если TEST mode
        # if settings.TEST:
        #     await _create_test_data(db)
        pass
