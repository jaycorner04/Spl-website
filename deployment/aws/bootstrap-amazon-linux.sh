#!/usr/bin/env bash

set -euo pipefail

DEPLOYMENT_ROOT="/srv/spl"
SERVICE_NAME="spl-node-app"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deployment-root)
      DEPLOYMENT_ROOT="$2"
      shift 2
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

APP_ROOT="${DEPLOYMENT_ROOT}/app"
LOGS_ROOT="${DEPLOYMENT_ROOT}/logs"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_CONF_PATH="/etc/nginx/conf.d/spl-app.conf"
SYSTEMCTL_BIN="$(command -v systemctl || true)"

if [[ -z "$SYSTEMCTL_BIN" && -x "/usr/bin/systemctl" ]]; then
  SYSTEMCTL_BIN="/usr/bin/systemctl"
fi

if [[ -z "$SYSTEMCTL_BIN" ]]; then
  echo "systemctl was not found on this server." >&2
  exit 1
fi

echo "Installing Linux deployment dependencies"
dnf install -y amazon-ssm-agent nodejs npm nginx git unzip curl-minimal python3 rsync docker

echo "Enabling Amazon SSM Agent, Docker, and Nginx"
"$SYSTEMCTL_BIN" enable --now amazon-ssm-agent
"$SYSTEMCTL_BIN" enable --now docker
"$SYSTEMCTL_BIN" enable --now nginx

echo "Creating deployment directories"
mkdir -p "$APP_ROOT" "$LOGS_ROOT"
chown -R ec2-user:ec2-user "$DEPLOYMENT_ROOT"

echo "Writing systemd service file"
cat > "$SERVICE_PATH" <<EOF
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

echo "Writing Nginx reverse proxy config"
cat > "$NGINX_CONF_PATH" <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

echo "Validating and reloading services"
nginx -t
"$SYSTEMCTL_BIN" daemon-reload
"$SYSTEMCTL_BIN" enable "$SERVICE_NAME"
"$SYSTEMCTL_BIN" restart nginx

echo
echo "Bootstrap complete."
echo "Deployment root: $DEPLOYMENT_ROOT"
echo "Service name: $SERVICE_NAME"
echo "Next step: add GitHub repo secrets and trigger the workflow."
