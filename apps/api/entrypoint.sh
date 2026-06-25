#!/bin/sh
# Elixio API container entrypoint
# - Logs every step so Railway captures output
# - Runs Prisma migrations idempotently before starting the server
# - Optionally bootstraps an admin user from env vars (idempotent)
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

# Optional admin bootstrap. Set ADMIN_BOOTSTRAP_EMAIL and
# ADMIN_BOOTSTRAP_PASSWORD in the environment to promote or create
# an admin user. Idempotent — safe to run on every deploy.
if [ -n "$ADMIN_BOOTSTRAP_EMAIL" ] && [ -n "$ADMIN_BOOTSTRAP_PASSWORD" ]; then
  echo "[entrypoint] bootstrapping admin $ADMIN_BOOTSTRAP_EMAIL"
  node /app/dist/apps/api/src/scripts/bootstrap-admin-internal.js
  echo "[entrypoint] bootstrap complete"
fi

echo "[entrypoint] starting API server"
exec node /app/dist/apps/api/src/server.js