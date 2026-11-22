#!/usr/bin/env bash
# Run on a fresh Ubuntu VPS as root or with sudo
set -euo pipefail

echo "==> Installing Docker"
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

echo "==> Done. Next:"
echo "  git clone https://github.com/kumarsumit68439-code/jilowa-chat.git"
echo "  cd jilowa-chat/bot-hosting"
echo "  export BOT_TOKEN=... API_BASE=https://your-app.vercel.app CHAT_ID=..."
echo "  docker compose up -d --build"
