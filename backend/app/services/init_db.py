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
        if settings.TEST:
            await _create_test_data(db)


async def _create_test_data(db: AsyncSession):
    """Тестовые данные для демонстрации."""
    from app.models.models import Note, Tag
    import random

    note_count = await db.execute(select(Note))
    notes = note_count.scalars().all()
    if notes:
        return  # Данные уже есть

    # Получаем роль преподавателя и админа
    admin_result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
    admin_user = admin_result.scalar_one_or_none()

    if not admin_user:
        return
        
    TOPICS = [
        "Machine Learning", "Deep Learning", "Neural Networks", "Computer Vision",
        "Natural Language Processing", "Reinforcement Learning", "Linear Algebra", "Calculus",
        "Probability Theory", "Statistics", "Data Mining", "Big Data", "Predictive Modeling",
        "Distributed Systems", "Cloud Computing", "Docker", "Kubernetes", "Redis",
        "Microservices", "REST API", "GraphQL", "WebSockets", "Kafka", "RabbitMQ",
        "Frontend Development", "React", "Vue", "Angular", "Svelte", "Webpack",
        "Backend Development", "Node.js", "Python", "Go", "Rust", "Java", "C++",
        "Database Design", "SQL", "PostgreSQL", "NoSQL", "MongoDB", "Cassandra",
        "Algorithms", "Data Structures", "Graph Theory", "Dynamic Programming", "Sorting",
        "Quantum Computing", "Cryptography", "Blockchain", "Smart Contracts", "Web3",
        "Cybersecurity", "Penetration Testing", "Malware Analysis", "Network Security",
        "Operating Systems", "Linux Kernel", "Memory Management", "File Systems", "Concurrency",
        "System Design", "Software Architecture", "Design Patterns", "Agile", "Scrum",
        "CI/CD", "DevOps", "Infrastructure as Code", "Terraform", "Ansible"
    ]
    
    TAGS = [
        {"name": "AI/ML (Демо)", "color": "#ff4b4b"},
        {"name": "Math (Демо)", "color": "#4b79ff"},
        {"name": "DevOps (Демо)", "color": "#4bffb8"},
        {"name": "Frontend (Демо)", "color": "#f1ff4b"},
        {"name": "Backend (Демо)", "color": "#ff4bf4"},
        {"name": "Bases (Демо)", "color": "#ffa74b"},
        {"name": "Security (Демо)", "color": "#4be8ff"},
        {"name": "Architecture (Демо)", "color": "#ffffff"}
    ]

    db_tags = []
    for tag_data in TAGS:
        res = await db.execute(select(Tag).where(Tag.name == tag_data["name"]))
        existing_tag = res.scalar_one_or_none()
        if existing_tag:
            db_tags.append(existing_tag)
        else:
            t = Tag(name=tag_data["name"], color=tag_data["color"])
            db.add(t)
            db_tags.append(t)
    
    await db.flush()

    new_notes = []
    for i, topic in enumerate(TOPICS):
        note_tags = random.sample(db_tags, random.randint(1, 3))
        n = Note(
            title=topic,
            content=f"# {topic}\n\nСгенерированный тестовый контент для красивого отображения графа знаний. Тема охватывает базовые определения, ключевые подходы и взаимосвязи с другими дисциплинами.",
            is_published=True,
            author_id=admin_user.id,
            views_count=random.randint(10, 2000)
        )
        n.tags = note_tags
        new_notes.append(n)

    # Connect the graph
    for i, note in enumerate(new_notes):
        links = []
        num_links = random.randint(1, 6)
        for _ in range(num_links):
            if random.random() < 0.6:
                target_idx = max(0, min(len(new_notes) - 1, i + random.randint(-5, 5)))
            else:
                target_idx = random.randint(0, len(new_notes) - 1)
            
            if target_idx != i and new_notes[target_idx] not in links:
                links.append(new_notes[target_idx])
        note.linked_notes = links
    
    db.add_all(new_notes)
    await db.commit()
    logger.info(f"Тестовые данные созданы: {len(new_notes)} заметок и связей")
