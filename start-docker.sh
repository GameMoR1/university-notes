#!/usr/bin/env bash
# ================================================================
# Запуск УСУЗ через Docker Compose (PostgreSQL)
# ================================================================
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  УСУЗ — Docker Compose запуск            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-prod}"

if [ "$MODE" = "test" ]; then
    echo -e "${YELLOW}▶ Режим: TEST (SQLite, без PostgreSQL)${NC}"
    docker compose -f docker-compose.test.yml up --build "$@"
else
    echo -e "${YELLOW}▶ Режим: PRODUCTION (PostgreSQL)${NC}"
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo -e "${RED}! Создан .env из примера. Измените SECRET_KEY и пароли!${NC}"
    fi
    
    docker compose up --build -d
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ Система запущена!                    ║${NC}"
    echo -e "${GREEN}║  Frontend: http://localhost:80           ║${NC}"
    echo -e "${GREEN}║  API:      http://localhost:8000/api     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
fi
