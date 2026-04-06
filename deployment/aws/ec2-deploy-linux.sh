#!/usr/bin/env bash

set -euo pipefail

DEPLOYMENT_ROOT=""
BUNDLE_ROOT=""
SERVICE_NAME="spl-node-app"
NODE_ENVIRONMENT="production"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deployment-root)
      DEPLOYMENT_ROOT="$2"
      shift 2
      ;;
    --bundle-root)
      BUNDLE_ROOT="$2"
      shift 2
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --node-env)
      NODE_ENVIRONMENT="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DEPLOYMENT_ROOT" || -z "$BUNDLE_ROOT" ]]; then
  echo "Both --deployment-root and --bundle-root are required." >&2
  exit 1
fi

APP_ROOT="${DEPLOYMENT_ROOT}/app"
LOGS_ROOT="${DEPLOYMENT_ROOT}/logs"
FRONTEND_ROOT="${APP_ROOT}/spl-frontend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SYSTEMCTL_BIN="$(command -v systemctl || true)"

if [[ -z "$SYSTEMCTL_BIN" && -x "/usr/bin/systemctl" ]]; then
  SYSTEMCTL_BIN="/usr/bin/systemctl"
fi

write_backend_env() {
  cat > "${APP_ROOT}/.env.production.local" <<EOF
NODE_ENV=production
PORT=${PROD_PORT:-4000}
HOST=${PROD_HOST:-0.0.0.0}
DB_SERVER=${PROD_DB_SERVER:-}
DB_PORT=${PROD_DB_PORT:-1433}
DB_NAME=${PROD_DB_NAME:-SPLSqlServer}
DB_BOOTSTRAP_DATABASE=${PROD_DB_BOOTSTRAP_DATABASE:-master}
DB_USER=${PROD_DB_USER:-}
DB_PASSWORD=${PROD_DB_PASSWORD:-}
SPL_AUTH_SECRET=${PROD_AUTH_SECRET:-}
SPL_MONITORING_TOKEN=${PROD_MONITORING_TOKEN:-}
CORS_ALLOWED_ORIGINS=${PROD_CORS_ALLOWED_ORIGINS:-same-origin}
RATE_LIMIT_ENABLED=${PROD_RATE_LIMIT_ENABLED:-true}
DB_ENCRYPT=${PROD_DB_ENCRYPT:-false}
DB_TRUST_SERVER_CERTIFICATE=${PROD_DB_TRUST_SERVER_CERTIFICATE:-true}
EOF
}

write_frontend_env() {
  cat > "${FRONTEND_ROOT}/.env.production.local" <<EOF
VITE_API_BASE_URL=${PROD_VITE_API_BASE_URL:-/api}
VITE_ENABLE_HERO_VIDEO=${PROD_VITE_ENABLE_HERO_VIDEO:-false}
VITE_HERO_VIDEO_URL=${PROD_VITE_HERO_VIDEO_URL:-}
EOF
}

ensure_service_file() {
  if [[ -f "$SERVICE_FILE" ]]; then
    return
  fi

  cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=SPL Node Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=${APP_ROOT}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node ${APP_ROOT}/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  "$SYSTEMCTL_BIN" daemon-reload
  "$SYSTEMCTL_BIN" enable "$SERVICE_NAME"
}

echo "Preparing deployment directories"
mkdir -p "$APP_ROOT" "$LOGS_ROOT"

echo "Syncing application bundle"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude '.env*' \
    --exclude 'node_modules' \
    --exclude 'server-media' \
    --exclude 'spl-frontend/node_modules' \
    --exclude 'spl-frontend/dist' \
    "${BUNDLE_ROOT}/" "${APP_ROOT}/"
else
  find "$APP_ROOT" -mindepth 1 -maxdepth 1 \
    ! -name '.env.production.local' \
    ! -name 'node_modules' \
    ! -name 'server-media' \
    ! -name 'spl-frontend' \
    -exec rm -rf {} +
  cp -a "${BUNDLE_ROOT}/." "${APP_ROOT}/"
  rm -rf "${APP_ROOT}/node_modules" "${FRONTEND_ROOT}/node_modules" "${FRONTEND_ROOT}/dist"
fi

chown -R ec2-user:ec2-user "$DEPLOYMENT_ROOT"

echo "Writing production environment files"
write_backend_env
write_frontend_env

pushd "$APP_ROOT" >/dev/null

export NODE_ENV="$NODE_ENVIRONMENT"

echo "Installing backend dependencies"
npm ci

echo "Installing frontend dependencies"
npm ci --prefix spl-frontend

echo "Building frontend"
npm run build:frontend

echo "Validating runtime environment"
npm run validate:env

echo "Running database migrations"
npm run db:migrate

echo "Checking database connectivity"
npm run db:health

popd >/dev/null

if [[ -n "$SYSTEMCTL_BIN" ]]; then
  echo "Ensuring systemd service exists"
  ensure_service_file

  echo "Restarting application service"
  "$SYSTEMCTL_BIN" restart "$SERVICE_NAME"
  "$SYSTEMCTL_BIN" status "$SERVICE_NAME" --no-pager || true

  if command -v nginx >/dev/null 2>&1; then
    echo "Reloading Nginx"
    "$SYSTEMCTL_BIN" reload nginx || true
  fi
fi

pushd "$APP_ROOT" >/dev/null
echo "Running post-start monitoring check"
npm run monitor:health
popd >/dev/null

echo "Linux EC2 deployment completed."
