#!/bin/sh
# Elixio API container entrypoint
# - Logs every step so Railway captures output
# - Runs Prisma migrations idempotently before starting the server
set -e

echo "[entrypoint] starting at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[entrypoint] running prisma migrate deploy"
node /app/node_modules/prisma/build/index.js migrate deploy \
  --schema=/app/prisma/schema.prisma
MIGRATE_EXIT=$?
echo "[entrypoint] prisma migrate deploy exited with $MIGRATE_EXIT"

if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "[entrypoint] FATAL: migrations failed; refusing to start server"
  exit $MIGRATE_EXIT
fi

echo "[entrypoint] starting API server"
exec node /app/dist/apps/api/src/server.js