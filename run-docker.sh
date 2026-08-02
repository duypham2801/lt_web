#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  printf '%s\n' "Docker Compose is not installed."
  exit 1
fi

$COMPOSE down --remove-orphans
$COMPOSE build backend seed frontend
$COMPOSE --profile tools run --rm seed
$COMPOSE up -d

printf '%s\n' "Frontend dev server: http://localhost:5174"
printf '%s\n' "Frontend source is mounted, so React/CSS changes hot reload without rebuilding."
printf '%s\n' "Backend API: http://localhost:8000"
