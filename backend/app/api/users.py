"""Users + Admin API."""
import datetime
import platform
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.minio_client import file_storage
from app.models.models import User, Role, Note, Comment, ActivityLog, Folder, Tag, File
from app.schemas.schemas import (
    UserOut, UserUpdate, UserAdminUpdate, RoleOut, RoleCreate, RoleUpdate,
    PaginatedUsers, PaginatedLogs, StatsOut, SystemHealth, ActivityHistory, MessageResponse
)
from app.api.deps import get_current_user, require_admin
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])


# ── Список пользователей (публичный, для фильтров) ────────────────────────────
@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(User).options(selectinload(User.role)).order_by(User.name)
    result = await db.execute(query)
    users = result.scalars().all()
    return PaginatedUsers(
        items=users, total=len(users), page=1, per_page=len(users),
        pages=1
    )


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
    total_tags = (await db.execute(select(func.count()).select_from(Tag))).scalar() or 0
    total_files = (await db.execute(select(func.count()).select_from(File))).scalar() or 0
    total_folders = (await db.execute(select(func.count()).select_from(Folder))).scalar() or 0
    total_views = (await db.execute(select(func.coalesce(func.sum(Note.views_count), 0)).select_from(Note))).scalar() or 0

    roles = (await db.execute(select(Role))).scalars().all()
    notes_by_role = {}
    for role in roles:
        count = (await db.execute(select(func.count()).select_from(User).where(User.role_id == role.id))).scalar() or 0
        notes_by_role[role.name] = count

    total_blocked = (await db.execute(select(func.count()).select_from(User).where(User.is_blocked == True))).scalar() or 0

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
        total_files=total_files,
        total_folders=total_folders,
        total_views=total_views,
        notes_by_role=notes_by_role,
        recent_logs=recent_logs,
    )


# ── История активности для графиков ──────────────────────────────────────────
@router.get("/admin/activity-history", response_model=list[ActivityHistory])
async def admin_activity_history(
    days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from sqlalchemy import text
    results = []
    today = datetime.date.today()

    for i in range(days - 1, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_start = datetime.datetime.combine(day, datetime.time.min).replace(tzinfo=datetime.timezone.utc)
        day_end = datetime.datetime.combine(day, datetime.time.max).replace(tzinfo=datetime.timezone.utc)

        registrations = (await db.execute(
            select(func.count()).select_from(User).where(
                User.created_at >= day_start, User.created_at <= day_end
            )
        )).scalar() or 0

        notes_created = (await db.execute(
            select(func.count()).select_from(Note).where(
                Note.created_at >= day_start, Note.created_at <= day_end
            )
        )).scalar() or 0

        comments = (await db.execute(
            select(func.count()).select_from(Comment).where(
                Comment.created_at >= day_start, Comment.created_at <= day_end
            )
        )).scalar() or 0

        results.append(ActivityHistory(
            date=day.isoformat(),
            registrations=registrations,
            notes_created=notes_created,
            comments=comments,
        ))

    return results


# ── Здоровье системы ─────────────────────────────────────────────────────────
@router.get("/admin/health", response_model=SystemHealth)
async def admin_health(
    _: User = Depends(require_admin),
):
    import os
    import time

    # Database check
    db_status = "ok"
    db_error = None
    db_type = "PostgreSQL"
    try:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await session.execute(select(func.count()).select_from(Note))
        if __debug__:
            db_type = "SQLite" if "sqlite" in str(settings.database_url) else "PostgreSQL"
    except Exception as e:
        db_status = "error"
        db_error = str(e)

    # Storage check (MinIO / local filesystem)
    storage_status = "ok"
    storage_error = None
    try:
        test_file = b"health-check"
        p = await file_storage.upload(0, ".health", test_file, "text/plain")
        d = await file_storage.download(p)
        await file_storage.delete(p)
        if d != test_file:
            storage_status = "degraded"
    except Exception as e:
        storage_status = "error"
        storage_error = str(e)

    # System info — расширенная статистика
    import psutil
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_freq = psutil.cpu_freq()
        cpu_stats = psutil.cpu_stats()

        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()

        disk = psutil.disk_usage("/")
        disk_io = psutil.disk_io_counters()

        net = psutil.net_io_counters()

        boot_time_dt = datetime.datetime.fromtimestamp(psutil.boot_time())
        uptime_seconds = int((datetime.datetime.now() - boot_time_dt).total_seconds())

        procs = len(psutil.pids())

        load_avg = getattr(psutil, "getloadavg", None)
        load1 = load5 = load15 = 0
        if load_avg:
            try:
                load1, load5, load15 = psutil.getloadavg()
            except Exception:
                pass
    except ImportError:
        cpu_percent = 0; cpu_count = 0; cpu_count_logical = 0; cpu_freq = None
        cpu_stats = None
        mem = {"total": 0, "available": 0, "percent": 0, "used": 0, "free": 0}
        swap = {"total": 0, "used": 0, "percent": 0}
        disk = {"total": 0, "used": 0, "free": 0, "percent": 0}
        disk_io = None
        net = None
        boot_time_dt = None
        uptime_seconds = 0
        procs = 0
        load1 = load5 = load15 = 0
    except Exception:
        cpu_percent = 0; cpu_count = 0; cpu_count_logical = 0; cpu_freq = None
        cpu_stats = None
        mem = {"total": 0, "available": 0, "percent": 0, "used": 0, "free": 0}
        swap = {"total": 0, "used": 0, "percent": 0}
        disk = {"total": 0, "used": 0, "free": 0, "percent": 0}
        disk_io = None
        net = None
        boot_time_dt = None
        uptime_seconds = 0
        procs = 0
        load1 = load5 = load15 = 0

    return SystemHealth(
        status="ok" if db_status == "ok" and storage_status == "ok" else "degraded",
        database={
            "status": db_status,
            "error": db_error,
            "type": db_type,
        },
        storage={
            "status": storage_status,
            "error": storage_error,
            "type": "MinIO" if file_storage._use_minio else "Local",
        },
        system={
            "boot_time": boot_time_dt.isoformat() if boot_time_dt else "",
            "uptime_seconds": uptime_seconds,
            "python_version": platform.python_version(),
            "hostname": platform.node(),
        },
        cpu={
            "percent": cpu_percent,
            "count": cpu_count,
            "count_logical": cpu_count_logical,
            "frequency_current": cpu_freq.current if cpu_freq else 0,
            "frequency_max": cpu_freq.max if cpu_freq else 0,
            "ctx_switches": cpu_stats.ctx_switches if cpu_stats else 0,
            "interrupts": cpu_stats.interrupts if cpu_stats else 0,
            "load_1": round(load1, 2),
            "load_5": round(load5, 2),
            "load_15": round(load15, 2),
        },
        memory={
            "total": mem.total if hasattr(mem, 'total') else mem.get('total', 0),
            "available": mem.available if hasattr(mem, 'available') else mem.get('available', 0),
            "used": mem.used if hasattr(mem, 'used') else mem.get('used', 0),
            "free": mem.free if hasattr(mem, 'free') else mem.get('free', 0),
            "percent": mem.percent if hasattr(mem, 'percent') else mem.get('percent', 0),
        },
        swap={
            "total": swap.total if hasattr(swap, 'total') else swap.get('total', 0),
            "used": swap.used if hasattr(swap, 'used') else swap.get('used', 0),
            "percent": swap.percent if hasattr(swap, 'percent') else swap.get('percent', 0),
        },
        disk={
            "total": disk.total if hasattr(disk, 'total') else disk.get('total', 0),
            "used": disk.used if hasattr(disk, 'used') else disk.get('used', 0),
            "free": disk.free if hasattr(disk, 'free') else disk.get('free', 0),
            "percent": disk.percent if hasattr(disk, 'percent') else disk.get('percent', 0),
            "read_bytes": disk_io.read_bytes if disk_io else 0,
            "write_bytes": disk_io.write_bytes if disk_io else 0,
            "read_count": disk_io.read_count if disk_io else 0,
            "write_count": disk_io.write_count if disk_io else 0,
        },
        network={
            "bytes_sent": net.bytes_sent if net else 0,
            "bytes_recv": net.bytes_recv if net else 0,
            "packets_sent": net.packets_sent if net else 0,
            "packets_recv": net.packets_recv if net else 0,
        },
        processes={
            "total": procs,
        },
    )


# ── Логи с пагинацией ────────────────────────────────────────────────────────
@router.get("/admin/logs", response_model=PaginatedLogs)
async def admin_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(ActivityLog).options(selectinload(ActivityLog.user))

    if action:
        query = query.where(ActivityLog.action.ilike(f"%{action}%"))
    if search:
        query = query.where(
            ActivityLog.details.ilike(f"%{search}%")
            | ActivityLog.action.ilike(f"%{search}%")
            | ActivityLog.entity_type.ilike(f"%{search}%")
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(ActivityLog.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    logs = result.scalars().all()

    items = [
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

    return PaginatedLogs(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, (total + per_page - 1) // per_page),
    )
