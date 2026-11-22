# Jilowa Bot Hosting (Discord / Telegram style)

Official Discord and Telegram host bots on **their** cloud.
Here you host bots the same way developers do in the real world:

- **VPS** (Ubuntu, DigitalOcean, AWS, Railway, Render, …)
- **Docker**
- **Node.js** or **Python**
- Long-polling or **webhooks** against the Jilowa Bot API

Your bot token comes from **BotFather** on Jilowa Chat (`/botfather`).

## Architecture

```
Your VPS / Docker container
    │
    │  HTTPS or long-poll
    ▼
Jilowa Chat API
  GET  /api/bot/{token}/getMe
  POST /api/bot/{token}/sendMessage
  POST /api/bot/{token}/setWebhook   (optional)
  POST /api/bot/{token}/webhook      (incoming updates if webhook set)
```

## Quick start (Node.js)

```bash
cd bot-hosting/node-example
cp .env.example .env   # set BOT_TOKEN + CHAT_ID
npm install
npm start
```

## Quick start (Python)

```bash
cd bot-hosting/python-example
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python bot.py
```

## Docker (any VPS)

```bash
cd bot-hosting
# edit docker-compose.yml → BOT_TOKEN
docker compose up -d --build
```

## VPS checklist (Ubuntu)

1. Create droplet / VM (1 GB RAM is enough for a small bot)
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone this repo, set `BOT_TOKEN` from BotFather
4. `docker compose up -d`
5. Optional: nginx + HTTPS in front of webhook port 8080

## What is “real” vs official networks

| | Jilowa bots | Official Telegram / Discord |
|--|-------------|-----------------------------|
| Token | From Jilowa BotFather | From Telegram BotFather / Discord Dev Portal |
| Hosting | Your VPS / Docker / Railway | Their infrastructure + your VPS still runs *your* code |
| API | `/api/bot/{token}/...` on your chat site | `api.telegram.org` / Discord Gateway |

Same **developer workflow**: token → Node/Python process → Docker → VPS.
