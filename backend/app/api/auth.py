"""Auth API: регистрация, логин, refresh."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.models.models import User, Role, ActivityLog
from app.schemas.schemas import UserRegister, UserLogin, Token, TokenRefresh, UserOut, MessageResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Проверяем уникальность email
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    # Получаем роль студента по умолчанию
    role_result = await db.execute(select(Role).where(Role.name == "student"))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=500, detail="Роль по умолчанию не найдена")

    user = User(
        email=data.email,
        name=data.name,
        hashed_password=get_password_hash(data.password),
        role_id=role.id,
    )
    db.add(user)
    await db.flush()

    log = ActivityLog(user_id=user.id, action="register", entity_type="user", entity_id=user.id)
    db.add(log)
    await db.commit()

    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user.id)
    )
    return result.scalar_one()


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Пользователь заблокирован")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    log = ActivityLog(user_id=user.id, action="login", entity_type="user", entity_id=user.id)
    db.add(log)
    await db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/refresh", response_model=Token)
async def refresh_token(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Недействительный refresh токен")

    user_id = int(payload.get("sub", 0))
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user or user.is_blocked:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    access_token = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return Token(access_token=access_token, refresh_token=new_refresh, user=user)
