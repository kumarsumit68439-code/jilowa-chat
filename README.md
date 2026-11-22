# Jilowa Chat

Discord / Telegram style **real-time** chat app connected to **AI Gateway Hub**.

- Same Supabase project → shared login sessions (when configured)
- Real-time messages via Supabase Realtime
- AI channels call your Gateway (`POST /api/v1/chat/completions`)
- Servers, channels, DMs-style layout

## Setup

1. Copy `.env.example` → `.env.local`
2. Use the **same** `NEXT_PUBLIC_SUPABASE_URL` and anon key as AI Gateway Hub
3. Set `NEXT_PUBLIC_GATEWAY_URL` to your gateway (e.g. `https://ub-mauve.vercel.app`)
4. Run SQL in Supabase (see `supabase/schema.sql`)
5. `npm install && npm run dev`

## Deploy

Connect this repo to Vercel. Add the same env vars. Add your chat domain to Supabase Auth redirect URLs if you enable Google login later.

## Pages

| Path | Purpose |
|------|---------|
| `/` | Redirect to app or login |
| `/login` | Email login (Supabase) |
| `/app` | Main chat (servers + channels + messages) |
| `/settings` | Gateway key + profile |
