#!/usr/bin/env bash
# Cap nhat va khoi dong lai app tren server.
# Dung: ./deploy.sh
set -e

cd "$(dirname "$0")"

echo "==> git pull"
git pull --ff-only

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> log gan day:"
docker compose logs --tail 30 asset-tracker
