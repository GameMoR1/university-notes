"""
Конфигурация приложения — читается из .env файла.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Ищем .env сначала рядом с backend, потом в корне проекта
for env_path in [
    Path(__file__).parent.parent.parent / ".env",
    Path(__file__).parent.parent / ".env",
    Path(".env"),
]:
    if env_path.exists():
        load_dotenv(env_path, override=False)
        break


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Режим
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # PostgreSQL
    POSTGRES_USER: str = "notes_user"
    POSTGRES_PASSWORD: str = "notes_password"
    POSTGRES_DB: str = "university_notes"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # JWT
    SECRET_KEY: str = "change-me-in-production-minimum-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Первый admin
    ADMIN_EMAIL: str = "admin@university.ru"
    ADMIN_PASSWORD: str = "Admin1234!"
    ADMIN_NAME: str = "Администратор"

    # MinIO (S3-совместимое хранилище файлов)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "usuz-files"
    MINIO_SECURE: bool = False
    MINIO_LOCAL_PATH: str = "./data/files"  # для локального режима (без MinIO)

    # Демо-пользователи
    TEACHER_EMAIL: str = "teacher@university.ru"
    TEACHER_PASSWORD: str = "Teacher123!"
    TEACHER_NAME: str = "Преподаватель (демо)"

    STUDENT_EMAIL: str = "student@university.ru"
    STUDENT_PASSWORD: str = "Student123!"
    STUDENT_NAME: str = "Студент (демо)"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def ALEMBIC_CFG_PATH(self) -> str:
        return str(Path(__file__).parent.parent.parent / "alembic.ini")


settings = Settings()
