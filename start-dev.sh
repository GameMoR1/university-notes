#!/usr/bin/env bash
# ================================================================
# Быстрый запуск УСУЗ в тестовом режиме (SQLite, без Docker)
# ================================================================
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  УСУЗ — Запуск в тестовом режиме    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Backend ─────────────────────────────────────────────────────
echo -e "${YELLOW}▶ Запуск Backend (FastAPI + SQLite)...${NC}"

cd "$ROOT_DIR/backend"

# Создаём venv если нет
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "  Создан виртуальный python-env"
fi

source .venv/bin/activate
pip install -q -r requirements.txt

# .env
if [ ! -f "$ROOT_DIR/.env" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "  Создан .env из примера"
fi

mkdir -p data
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo -e "${GREEN}  Backend запущен (PID: $BACKEND_PID) → http://localhost:8000${NC}"
echo -e "${GREEN}  Swagger UI → http://localhost:8000/docs${NC}"

sleep 3

# ─── Frontend ────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Запуск Frontend (React + Vite)...${NC}"

cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}  Frontend запущен (PID: $FRONTEND_PID) → http://localhost:3000${NC}"

# ─── Финал ───────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Система запущена!                    ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Frontend: http://localhost:3000         ║${NC}"
echo -e "${GREEN}║  API:      http://localhost:8000/api     ║${NC}"
echo -e "${GREEN}║  Docs:     http://localhost:8000/docs    ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Тестовые аккаунты:                      ║${NC}"
echo -e "${GREEN}║  admin@university.ru / Admin1234!         ║${NC}"
echo -e "${GREEN}║  teacher@university.ru / Teacher123!      ║${NC}"
echo -e "${GREEN}║  student@university.ru / Student123!      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "Нажмите Ctrl+C для остановки..."

# Ждём и завершаем оба процесса
cleanup() {
    echo ""
    echo -e "${YELLOW}Остановка сервисов...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Остановлено.${NC}"
    exit 0
}

trap cleanup INT TERM
wait
