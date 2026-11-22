# Jilowa Chat

Discord-style servers/channels + Telegram-style BotFather, connected to **AI Gateway Hub**.

## Fix MIDDLEWARE_INVOCATION_FAILED

That error means env vars were missing on Vercel. Set:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GATEWAY_URL=https://ub-mauve.vercel.app
```

Optional for bot API posting:

```
SUPABASE_SERVICE_ROLE_KEY=
```

Redeploy. If env is still missing, `/setup` explains the steps (middleware no longer hard-crashes).

## Database

Run `supabase/schema.sql` in the Supabase SQL editor.

## Features (this platform)

| Area | Status |
|------|--------|
| Servers / channels / live messages | Yes |
| AI channels → AI Gateway | Yes |
| BotFather + real platform bot tokens | Yes |
| Bot HTTP API sendMessage / getMe | Yes |
| Friends page | Basic |
| Official Telegram/Discord cloud bots | No — use their developer portals |

Official Telegram BotFather and Discord Developer Portal create bots on *their* networks. We create bots that work **inside Jilowa Chat** with tokens for `/api/bot/...`.

## Pages

- `/login` — auth
- `/app` — main Discord-like UI
- `/botfather` — create bots + tokens
- `/friends` — friends list
- `/settings` — gateway key
- `/setup` — env missing help
