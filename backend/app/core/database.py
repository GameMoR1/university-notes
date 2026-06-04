from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


class Base(DeclarativeBase):
    pass


_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = settings.database_url
        if settings.TEST:
            _engine = create_async_engine(
                url, echo=settings.DEBUG, connect_args={"check_same_thread": False},
            )
        else:
            _engine = create_async_engine(url, echo=settings.DEBUG, pool_pre_ping=True)
    return _engine


_session_maker = None


def get_session_maker():
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    return _session_maker


async def get_db() -> AsyncSession:
    async with get_session_maker()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
