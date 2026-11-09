#!/usr/bin/env bash
# Modo local: solo Postgres en Docker; API (.NET) y cliente (Vite) corren en tu máquina.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && set -a && . ./.env && set +a
DB_USER="${POSTGRES_USER:-game}"
DB_PASS="${POSTGRES_PASSWORD:-game_dev_password}"
DB_NAME="${POSTGRES_DB:-gamedb}"

if ! dotnet --list-sdks 2>/dev/null | grep -q '^9\.'; then
  echo "Falta el SDK de .NET 9 (server/ apunta a net9.0). Instálalo con: brew install --cask dotnet-sdk@9" >&2
  exit 1
fi

echo "→ Levantando Postgres en Docker (localhost:5433)…"
docker compose up -d --wait db

[ -d client/node_modules/.bin ] || (cd client && npm install)

export ASPNETCORE_ENVIRONMENT=Development
export ASPNETCORE_URLS=http://localhost:5050
export ConnectionStrings__Default="Host=localhost;Port=5433;Database=$DB_NAME;Username=$DB_USER;Password=$DB_PASS"

trap 'kill 0' EXIT INT TERM

echo "→ API en http://localhost:5050 (dotnet watch)"
(cd server && dotnet watch run --no-hot-reload 2>&1 | sed 's/^/[api] /') &

echo "→ Cliente en http://localhost:5173"
cd client && API_URL=http://localhost:5050 npm run dev
