# УСУЗ — Университетская система учебных заметок

> Автоматизированная система для публикации, хранения, структурирования и изучения учебных материалов в формате взаимосвязанных заметок (граф знаний).

---

## 🚀 Быстрый старт

### Запуск через Docker (рекомендуется)

```bash
cp .env.example .env
# Отредактируйте .env: задайте POSTGRES_PASSWORD, SECRET_KEY, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
docker compose up --build -d
```

Фронтенд будет доступен на `http://localhost:3000`, бэкенд — `http://localhost:8000`.

### Локальная разработка

```bash
# Требуется: Python 3.12+, Node.js 20+, PostgreSQL 16+, MinIO (или локальное хранение)

# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (другой терминал)
cd frontend
npm install
npm run dev
```

---

## 📍 Адреса

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:3000 (dev) / http://localhost:80 (docker) |
| Backend API | http://localhost:8000/api |
| Swagger Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

---

## 👤 Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@university.ru | Admin1234! |
| Преподаватель | teacher@university.ru | Teacher123! |
| Студент | student@university.ru | Student123! |

---

## ⚙️ Конфигурация `.env`

```env
# PostgreSQL
POSTGRES_USER=notes_user
POSTGRES_PASSWORD=notes_password
POSTGRES_DB=university_notes

# JWT (ОБЯЗАТЕЛЬНО сменить в продакшне!)
SECRET_KEY=your-super-secret-key-minimum-32-chars

# MinIO (S3-совместимое хранилище для файлов)
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_ENDPOINT=localhost:9000
MINIO_BUCKET=usuz-files

# Первый администратор (создаётся при первом запуске)
ADMIN_EMAIL=admin@university.ru
ADMIN_PASSWORD=Admin1234!
```

---

## 🏗️ Архитектура

```
university-notes/
├── backend/                # Python FastAPI + SQLAlchemy (async)
│   ├── app/
│   │   ├── main.py         # Точка входа, CORS, роутеры
│   │   ├── core/           # Config, DB (async session), MinIO client
│   │   ├── models/         # SQLAlchemy ORM-модели
│   │   ├── schemas/        # Pydantic-схемы запросов/ответов
│   │   ├── api/            # REST-роуты (auth, notes, graph, admin…)
│   │   └── services/       # Инициализация БД, сидирование
│   ├── migrations/         # Alembic миграции
│   └── requirements.txt
├── frontend/               # React + Vite + Tailwind
│   └── src/
│       ├── pages/          # Страницы (Login, Notes, Graph, Admin…)
│       ├── components/     # UI-компоненты (Header, Graph2D, Common…)
│       ├── store/          # Zustand (auth, ui)
│       └── utils/          # Axios API-клиент с перехватчиком токенов
├── .env                    # Конфигурация
├── docker-compose.yml      # Docker Compose (MinIO + PostgreSQL + приложения)
└── docker-compose-prod.yml # Production-сборка (nginx + SSL)
```

---

## 📦 Технологии

### Backend
- **Python 3.12** + **FastAPI** — REST API
- **SQLAlchemy 2.0** (async) — ORM
- **Alembic** — миграции БД
- **PostgreSQL 16** — база данных
- **MinIO** — S3-совместимое файловое хранилище (с запасным локальным хранением)
- **JWT** (python-jose) — access + refresh токены
- **bcrypt** — хэширование паролей
- **psutil** — мониторинг системы (CPU, RAM, диск)

### Frontend
- **React 18** + **Vite** — сборка
- **Three.js** + **@react-three/fiber** / **drei** — 3D граф знаний
- **Canvas 2D** — 2D граф знаний (альтернативный вид)
- **Framer Motion** — анимации (табы, переключения папок, пиллы)
- **CodeMirror 6** — Markdown-редактор с one-dark темой
- **react-markdown** + **remark-gfm** — рендеринг Markdown
- **Tailwind CSS** — стилизация
- **Zustand** — управление состоянием
- **lucide-react** — иконки

---

## 🔧 Функциональность

### ✅ Реализовано
- [x] Регистрация/авторизация (JWT, refresh tokens)
- [x] Ролевая модель: Администратор, Преподаватель, Студент
- [x] CRUD заметок с Markdown-редактором
- [x] Публикация/снятие с публикации
- [x] Теги с цветовой маркировкой
- [x] Связи между заметками
- [x] Поиск и фильтрация по тегам/папкам
- [x] Комментарии (вложенные, с отметкой «Ответ»)
- [x] **3D граф знаний** (Three.js, force-directed layout)
- [x] **2D граф знаний** (Canvas 2D, панорама/зум/перетаскивание)
- [x] Переключение между папками в графе с анимацией
- [x] Файловое хранилище (MinIO / локальное)
- [x] Тёмная и светлая темы с сохранением в localStorage
- [x] Административная панель:
  - Статистика (пользователи, заметки, просмотры, комментарии…)
  - Мониторинг (CPU, RAM, диск, PostgreSQL, MinIO)
  - Управление пользователями и ролями
  - Настройки сайта
  - Логи действий
  - Встроенная Swagger-документация API
- [x] Активность (графики регистраций/заметок/комментариев)
- [x] Docker Compose для разработки и продакшна

### 🔄 Планируется
- [ ] Email-уведомления
- [ ] Экспорт в PDF
- [ ] Полнотекстовый поиск (FTS)
- [ ] Личные сообщения

---

## 📚 Документация API

Swagger UI доступен:
- По адресу `http://localhost:8000/docs`
- Встроенном в админ-панель (вкладка «Статистика» → «API Документация»)

### Основные эндпоинты

```
POST   /api/auth/register           — регистрация
POST   /api/auth/login              — вход
POST   /api/auth/refresh            — обновление токена

GET    /api/notes                   — список заметок
POST   /api/notes                   — создать заметку
GET    /api/notes/{id}              — получить заметку
PUT    /api/notes/{id}              — обновить заметку
DELETE /api/notes/{id}              — удалить заметку

GET    /api/graph                   — данные для графа

GET    /api/tags                    — список тегов
POST   /api/tags                    — создать тег

GET    /api/notes/{id}/comments     — комментарии
POST   /api/notes/{id}/comments     — добавить комментарий

GET    /api/folders                 — список папок
POST   /api/folders                 — создать папку

GET    /api/users/me                — текущий пользователь
GET    /api/admin/users             — список пользователей (admin)
GET    /api/admin/stats             — статистика (admin)
GET    /api/admin/health            — мониторинг системы (admin)
```

---

## 🏫 Сведения о проекте

- **Заказчик**: Кафедра прикладной информатики ТАУ
- **Команда**: Баева В., Корнеев А., Жидков Н., Кочеткова Е., Степанова П.
- **Направление**: 09.03.03 «Прикладная информатика», 3 курс
- **Срок**: январь — июнь 2026
