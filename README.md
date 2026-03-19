# УСУЗ — Университетская система учебных заметок

> Автоматизированная система для публикации, хранения, структурирования и изучения учебных материалов в формате взаимосвязанных заметок (граф знаний).

---

## 🚀 Быстрый старт

### Тестовый режим (SQLite, без Docker)

```bash
# 1. Убедитесь, что установлены: Python 3.12+, Node.js 20+
# 2. Запустите скрипт:
chmod +x start-dev.sh
./start-dev.sh
```

Или вручную:

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Убедитесь: в .env файле TEST=true
uvicorn app.main:app --reload --port 8000

# Frontend (другой терминал)
cd frontend
npm install
npm run dev
```

### Docker (PostgreSQL)

```bash
cp .env.example .env
# Отредактируйте .env: TEST=false, задайте POSTGRES_PASSWORD и SECRET_KEY
docker compose up --build -d
```

### Docker тест-режим (SQLite)

```bash
docker compose -f docker-compose.test.yml up --build
```

---

## 📍 Адреса

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:3000 (dev) / http://localhost:80 (docker) |
| Backend API | http://localhost:8000/api |
| Swagger Docs | http://localhost:8000/docs |

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
TEST=true          # true → SQLite (разработка), false → PostgreSQL (продакшн)

# PostgreSQL (если TEST=false):
POSTGRES_USER=notes_user
POSTGRES_PASSWORD=notes_password
POSTGRES_DB=university_notes
POSTGRES_HOST=db

# JWT (ОБЯЗАТЕЛЬНО сменить в продакшне!):
SECRET_KEY=your-super-secret-key-minimum-32-chars

# Первый администратор:
ADMIN_EMAIL=admin@university.ru
ADMIN_PASSWORD=Admin1234!
```

---

## 🏗️ Архитектура

```
university-notes/
├── backend/                # Python FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py         # Точка входа
│   │   ├── core/           # Config, DB, Security
│   │   ├── models/         # ORM-модели
│   │   ├── schemas/        # Pydantic-схемы
│   │   ├── api/            # REST-роуты
│   │   └── services/       # Логика (инициализация БД)
│   └── requirements.txt
├── frontend/               # React + Three.js + Tailwind
│   └── src/
│       ├── pages/          # Страницы
│       ├── components/     # UI-компоненты
│       ├── store/          # Zustand state
│       └── utils/          # API-клиент
├── .env                    # Конфигурация
├── docker-compose.yml      # Production (PostgreSQL)
├── docker-compose.test.yml # Test (SQLite)
└── start-dev.sh            # Быстрый запуск
```

---

## 📦 Технологии

### Backend
- **Python 3.12** + **FastAPI** — REST API
- **SQLAlchemy 2.0** — ORM (async)
- **Alembic** — миграции
- **PostgreSQL 16** — продакшн БД
- **SQLite + aiosqlite** — тестовая БД
- **JWT** (python-jose) — аутентификация
- **bcrypt** — хэширование паролей

### Frontend
- **React 18** + **Vite**
- **Three.js** + **@react-three/fiber** — 3D граф
- **Framer Motion** — анимации
- **CodeMirror 6** — Markdown-редактор
- **react-markdown** — рендеринг Markdown
- **Tailwind CSS** — стили
- **Zustand** — state management

---

## 🔧 Функциональность

### ✅ Реализовано
- [x] Регистрация/авторизация (JWT, refresh tokens)
- [x] Ролевая модель: Администратор, Преподаватель, Студент
- [x] CRUD заметок с Markdown-редактором
- [x] Публикация/снятие с публикации
- [x] Теги с цветовой маркировкой
- [x] Связи между заметками
- [x] Поиск и фильтрация
- [x] Комментарии с вложенностью
- [x] Отметка комментариев как "Ответ"
- [x] **3D граф знаний** в стиле Obsidian (Three.js)
- [x] Административная панель (пользователи, роли, логи)
- [x] Переключение PostgreSQL ↔ SQLite через .env
- [x] Docker Compose для обоих режимов

### 🔄 Планируется
- [ ] Email-уведомления
- [ ] Экспорт в PDF
- [ ] Полнотекстовый поиск (PostgreSQL FTS)
- [ ] Личные сообщения
- [ ] Прикрепление файлов

---

## 📚 Документация API

Swagger UI доступен по адресу: `http://localhost:8000/docs`

### Основные эндпоинты

```
POST /api/auth/register    — регистрация
POST /api/auth/login       — вход
POST /api/auth/refresh     — обновление токена

GET  /api/notes            — список заметок
POST /api/notes            — создать заметку
GET  /api/notes/{id}       — получить заметку
PUT  /api/notes/{id}       — обновить заметку
DELETE /api/notes/{id}     — удалить заметку

GET  /api/graph            — данные для графа

GET  /api/tags             — список тегов
POST /api/tags             — создать тег

GET  /api/notes/{id}/comments   — комментарии
POST /api/notes/{id}/comments   — добавить комментарий

GET  /api/users/me         — текущий пользователь
GET  /api/admin/users      — список пользователей (admin)
GET  /api/admin/stats      — статистика (admin)
```

---

## 🏫 Сведения о проекте

- **Заказчик**: Кафедра прикладной информатики ТАУ
- **Команда**: Баева В., Корнеев А., Жидков Н., Кочеткова Е., Степанова П.
- **Направление**: 09.03.03 «Прикладная информатика», 3 курс
- **Срок**: январь — июнь 2026
