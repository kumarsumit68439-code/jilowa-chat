# Discord login (Supabase)

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. OAuth2 → Add redirect:
   `https://YOUR_SUPABASE_REF.supabase.co/auth/v1/callback`
3. Copy Client ID + Secret
4. Supabase → Authentication → Providers → **Discord** → enable → paste ID/Secret
5. Supabase → URL config → Redirect URLs include:
   `https://YOUR-CHAT-DOMAIN/auth/callback`
6. Redeploy Jilowa Chat

Same pattern as Google OAuth already documented for AI Gateway Hub.
