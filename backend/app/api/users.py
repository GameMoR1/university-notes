"""Users + Admin API."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import User, Role, Note, Comment, ActivityLog
from app.schemas.schemas import (
    UserOut, UserUpdate, UserAdminUpdate, RoleOut, RoleCreate, RoleUpdate,
    PaginatedUsers, StatsOut, MessageResponse
)
from app.api.deps import get_current_user, require_admin

router = APIRouter(tags=["users"])


# ── Текущий пользователь ──────────────────────────────────────────────────────
@router.get("/users/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/users/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.name:
        current_user.name = data.name
    if data.email:
        # Проверяем уникальность
        existing = await db.execute(select(User).where(User.email == data.email, User.id != current_user.id))
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Email уже занят")
        current_user.email = data.email
    await db.commit()
    result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == current_user.id))
    return result.scalar_one()


# ── Управление пользователями (admin) ─────────────────────────────────────────
@router.get("/admin/users", response_model=PaginatedUsers)
async def admin_list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(User).options(selectinload(User.role))
    if search:
        query = query.where(
            User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        items=users, total=total, page=page, per_page=per_page,
        pages=max(1, (total + per_page - 1) // per_page)
    )


@router.get("/admin/users/{user_id}", response_model=UserOut)
async def admin_get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    return user


@router.put("/admin/users/{user_id}", response_model=UserOut)
async def admin_update_user(
    user_id: int,
    data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404)
    if user.id == current_user.id:
        raise HTTPException(400, "Нельзя изменить собственные права")

    if data.is_blocked is not None:
        user.is_blocked = data.is_blocked
    if data.role_id is not None:
        role_result = await db.execute(select(Role).where(Role.id == data.role_id))
        role = role_result.scalar_one_or_none()
        if not role:
            raise HTTPException(404, "Роль не найдена")
        user.role_id = data.role_id
    if data.name:
        user.name = data.name

    log = ActivityLog(user_id=current_user.id, action="admin_update_user", entity_type="user", entity_id=user_id)
    db.add(log)
    await db.commit()

    result2 = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    return result2.scalar_one()


@router.delete("/admin/users/{user_id}", response_model=MessageResponse)
async def admin_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404)
    if user.id == current_user.id:
        raise HTTPException(400, "Нельзя удалить себя")
    await db.delete(user)
    await db.commit()
    return {"message": "Пользователь удалён"}


# ── Роли ──────────────────────────────────────────────────────────────────────
@router.get("/roles", response_model=list[RoleOut])
async def list_roles(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Role))
    return result.scalars().all()


@router.post("/admin/roles", response_model=RoleOut, status_code=201)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await db.execute(select(Role).where(Role.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Роль уже существует")
    role = Role(**data.model_dump())
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.put("/admin/roles/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(role, k, v)
    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/admin/roles/{role_id}", response_model=MessageResponse)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(404)
    # Проверяем наличие пользователей
    user_count = (await db.execute(select(func.count()).select_from(User).where(User.role_id == role_id))).scalar()
    if user_count:
        raise HTTPException(400, f"Роль используется {user_count} пользователями")
    await db.delete(role)
    await db.commit()
    return {"message": "Роль удалена"}


# ── Статистика ────────────────────────────────────────────────────────────────
@router.get("/admin/stats", response_model=StatsOut)
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    total_notes = (await db.execute(select(func.count()).select_from(Note))).scalar() or 0
    published_notes = (await db.execute(select(func.count()).select_from(Note).where(Note.is_published == True))).scalar() or 0
    total_comments = (await db.execute(select(func.count()).select_from(Comment))).scalar() or 0
    from app.models.models import Tag
    total_tags = (await db.execute(select(func.count()).select_from(Tag))).scalar() or 0

    # Пользователи по ролям
    roles = (await db.execute(select(Role))).scalars().all()
    notes_by_role = {}
    for role in roles:
        count = (await db.execute(select(func.count()).select_from(User).where(User.role_id == role.id))).scalar() or 0
        notes_by_role[role.name] = count

    # Последние логи
    logs_result = await db.execute(
        select(ActivityLog).options(selectinload(ActivityLog.user))
        .order_by(ActivityLog.created_at.desc()).limit(20)
    )
    logs = logs_result.scalars().all()
    recent_logs = [
        {
            "id": l.id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "created_at": l.created_at.isoformat(),
            "user": {"id": l.user.id, "name": l.user.name} if l.user else None,
        }
        for l in logs
    ]

    return StatsOut(
        total_users=total_users,
        total_notes=total_notes,
        published_notes=published_notes,
        total_comments=total_comments,
        total_tags=total_tags,
        notes_by_role=notes_by_role,
        recent_logs=recent_logs,
    )
