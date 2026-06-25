#!/usr/bin/env bash
# Deploy Elixio Digital API to Railway + Postgres.
# Run after `railway login` in your own terminal.
#
# Reads real secrets from ~/.mavis/secrets/elixio-digital/
# Fills placeholder values for OAuth/Resend/EAS tokens (set those
# in Railway's dashboard or by editing this file).
#
# Re-running is safe — every step is idempotent.

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/Users/abdulsalim/Desktop/Elixio_Digital}"
SECRETS_DIR="${SECRETS_DIR:-$HOME/.mavis/secrets/elixio-digital}"
PROJECT_NAME="elixio-digital"
SERVICE_NAME="elixio-api"
DB_SERVICE_NAME="elixio-db"
REGION="us-west1"

JWT_SECRET="$(cat "$SECRETS_DIR/JWT_SECRET")"
KEK="$(cat "$SECRETS_DIR/ELIXIO_MFA_KEY_ENCRYPTION_KEY")"

# Placeholders — replace with real values from your password manager
# once the OAuth + Resend + Resend-from-address setup is done.
PLACEHOLDER_OAUTH="placeholder-set-real-value-in-railway-dashboard"
RESEND_FROM="Elixio Digital <no-reply@elixio.digital>"

echo "==> Logging in to Railway (skip if already authenticated)"
railway whoami >/dev/null 2>&1 || {
  echo "Not logged in. Run 'railway login' in another terminal, then re-run this script."
  exit 1
}

echo "==> Creating project: $PROJECT_NAME"
# `railway init` is idempotent — if the project already exists in the
# current directory, it links instead of creating. To force a fresh
# project we use `railway create` with --name.
if railway status --json 2>/dev/null | jq -e '.project' >/dev/null 2>&1; then
  echo "    Project already linked. Skipping create."
else
  railway create --name "$PROJECT_NAME" 2>&1
fi

echo "==> Adding PostgreSQL service"
# Use `railway add` for the database. If it's already added, this is a no-op.
if ! railway status --json 2>/dev/null | jq -e '.services | map(.name) | index("Postgres")' >/dev/null 2>&1; then
  railway add --plugin postgres 2>&1 || true
  # Rename the auto-named Postgres service for predictability
  DB_PLUGIN_ID=$(railway status --json 2>/dev/null | jq -r '.services | map(select(.plugin)) | .[0].id // empty')
  if [ -n "$DB_PLUGIN_ID" ]; then
    railway service "$DB_PLUGIN_ID" 2>&1 || true
  fi
fi

echo "==> Adding API service from the GitHub repo (root: apps/api)"
# We need to make sure the project has a service sourced from the
# elixio-digital repo. `railway up` would deploy the current dir;
# since we're using the Dockerfile in apps/api, we set service root
# to that.
API_SERVICE_ID=$(railway status --json 2>/dev/null | jq -r '.services | map(select(.name == "elixio-api")) | .[0].id // empty')
if [ -z "$API_SERVICE_ID" ]; then
  railway service create "$SERVICE_NAME" 2>&1 || true
  API_SERVICE_ID=$(railway status --json 2>/dev/null | jq -r '.services | map(select(.name == "elixio-api")) | .[0].id // empty')
fi
if [ -z "$API_SERVICE_ID" ]; then
  echo "    Could not find or create the API service. Add it manually in the Railway dashboard (New → GitHub Repo → elixio-digital, root: apps/api), then re-run this script."
  exit 1
fi

echo "==> Linking the GitHub repo to the API service"
# `railway service link` re-points the service. The CLI does this via
# the dashboard's "Connect Repo" flow. If your project was created
# from the dashboard already, this may be a no-op.
railway service "$API_SERVICE_ID" 2>&1 || true

echo "==> Setting environment variables on the API service"
# DATABASE_URL is auto-wired by the Postgres plugin reference
set_var() {
  local key="$1"
  local val="$2"
  if railway variables --service "$API_SERVICE_ID" --json 2>/dev/null | jq -e --arg k "$key" '.[$k]' >/dev/null 2>&1; then
    echo "    $key  = (already set, skipping)"
  else
    railway variables --service "$API_SERVICE_ID" --set "$key=$val" 2>&1
    echo "    $key  = set"
  fi
}

set_var NODE_ENV               "production"
set_var PORT                   "3000"
set_var CORS_ORIGIN            "https://elixio.digital,http://localhost:3001"
set_var JWT_SECRET             "$JWT_SECRET"
set_var ELIXIO_MFA_KEY_ENCRYPTION_KEY  "$KEK"
set_var ELIXIO_API_URL         "https://api.elixio.digital"
set_var ELIXIO_WEB_URL         "https://elixio.digital"
set_var ELIXIO_MOBILE_URL      "elixio://"
set_var EMAIL_FROM             "$RESEND_FROM"
set_var ELIXIO_WEBAUTHN_RP_ID  "elixio.digital"
set_var ELIXIO_WEBAUTHN_ORIGINS "https://elixio.digital,https://api.elixio.digital"

# Placeholders — fill in via the Railway dashboard once you have them
set_var RESEND_API_KEY          "$PLACEHOLDER_OAUTH"
set_var GOOGLE_CLIENT_ID         "$PLACEHOLDER_OAUTH"
set_var GOOGLE_CLIENT_SECRET     "$PLACEHOLDER_OAUTH"
set_var GITHUB_CLIENT_ID         "$PLACEHOLDER_OAUTH"
set_var GITHUB_CLIENT_SECRET     "$PLACEHOLDER_OAUTH"

echo ""
echo "==> Variables that still need real values (set in Railway dashboard → Variables):"
echo "    RESEND_API_KEY          (https://resend.com/api-keys)"
echo "    GOOGLE_CLIENT_ID        (https://console.cloud.google.com/apis/credentials)"
echo "    GOOGLE_CLIENT_SECRET    (same)"
echo "    GITHUB_CLIENT_ID        (https://github.com/settings/developers)"
echo "    GITHUB_CLIENT_SECRET    (same, generate a new client secret)"
echo ""

echo "==> Wiring DATABASE_URL to the Postgres service"
DB_SERVICE_ID=$(railway status --json 2>/dev/null | jq -r '.services | map(select(.plugin)) | .[0].id // empty')
if [ -n "$DB_SERVICE_ID" ]; then
  railway variables --service "$API_SERVICE_ID" --set "DATABASE_URL=\${{$DB_SERVICE_ID.DATABASE_URL}}" 2>&1 || true
  echo "    DATABASE_URL = \${{elixio-db.DATABASE_URL}}  (auto-resolved)"
fi

echo "==> Triggering a deploy"
railway up --service "$API_SERVICE_ID" --detach 2>&1 || railway redeploy --service "$API_SERVICE_ID" 2>&1

echo ""
echo "==> Done. Watch the deploy in the Railway dashboard."
echo "    https://railway.app/project/<your-project-id>"
echo ""
echo "Once the deploy is healthy, run the migration and bootstrap the admin:"
echo "    railway run --service $SERVICE_NAME pnpm --filter @elixio/api exec prisma migrate deploy"
echo "    railway run --service $SERVICE_NAME pnpm --filter @elixio/api exec tsx scripts/bootstrap-admin.ts <email> <password>"
