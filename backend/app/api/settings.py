"""Site Settings API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import SiteSetting, ActivityLog, User
from app.schemas.schemas import SiteSettingOut, SiteSettingCreate, SiteSettingUpdate, SiteSettingsMap
from app.api.deps import require_admin

router = APIRouter(tags=["settings"])


DEFAULT_SETTINGS = {
    "site_name": "УСУЗ",
    "site_description": "Университетская система учебных заметок",
    "allow_registration": "true",
    "default_role": "student",
    "maintenance_mode": "false",
    "max_notes_per_page": "18",
    "max_upload_size_mb": "10",
    "allow_comments": "true",
    "allow_guest_view": "true",
    "theme": "dark",
}


@router.get("/settings", response_model=list[SiteSettingOut])
async def list_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SiteSetting))
    return result.scalars().all()


@router.get("/settings/map", response_model=SiteSettingsMap)
async def get_settings_map(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SiteSetting))
    settings = result.scalars().all()
    return SiteSettingsMap(settings={s.key: s.value for s in settings})


@router.post("/admin/settings", response_model=SiteSettingOut, status_code=201)
async def create_setting(
    data: SiteSettingCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await db.execute(select(SiteSetting).where(SiteSetting.key == data.key))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Настройка уже существует")
    setting = SiteSetting(**data.model_dump())
    db.add(setting)
    await db.commit()
    await db.refresh(setting)
    return setting


@router.put("/admin/settings/{key}", response_model=SiteSettingOut)
async def update_setting(
    key: str,
    data: SiteSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(404, "Настройка не найдена")
    setting.value = data.value
    if data.description is not None:
        setting.description = data.description
    log = ActivityLog(
        user_id=current_user.id,
        action="update_setting",
        entity_type="settings",
        entity_id=setting.id,
        details=f"{key}: {data.value}",
    )
    db.add(log)
    await db.commit()
    await db.refresh(setting)
    return setting


@router.put("/admin/settings/bulk", response_model=dict)
async def bulk_update_settings(
    data: SiteSettingsMap,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    settings = await db.execute(select(SiteSetting))
    existing = {s.key: s for s in settings.scalars().all()}

    for key, value in data.settings.items():
        if key in existing:
            existing[key].value = value
        else:
            db.add(SiteSetting(key=key, value=value))

    log = ActivityLog(
        user_id=current_user.id,
        action="bulk_update_settings",
        entity_type="settings",
        entity_id=0,
        details=f"Updated {len(data.settings)} settings",
    )
    db.add(log)
    await db.commit()
    return {"message": f"Обновлено {len(data.settings)} настроек", "updated": len(data.settings)}
