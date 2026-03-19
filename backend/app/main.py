"""
Главный файл FastAPI-приложения.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api import auth, notes, comments, tags, graph, users
from app.services.init_db import init_db

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Запуск приложения. Режим: {'TEST (SQLite)' if settings.TEST else 'PRODUCTION (PostgreSQL)'}")
    await init_db()
    yield
    logger.info("Приложение остановлено")


app = FastAPI(
    title="Университетская система учебных заметок (УСУЗ)",
    description="REST API для управления учебными заметками в ВУЗе",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    # Нельзя смешивать allow_credentials=True с origin="*" — браузер заблокирует запросы.
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутеры
app.include_router(auth.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "mode": "test" if settings.TEST else "production",
        "db": "SQLite" if settings.TEST else "PostgreSQL",
    }


@app.get("/")
async def root():
    return {"message": "УСУЗ API v1.0", "docs": "/docs"}
