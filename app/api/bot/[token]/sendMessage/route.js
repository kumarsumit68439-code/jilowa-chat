import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req, { params }) {
  const token = decodeURIComponent(params.token || '');
  const admin = adminClient();
  if (!admin) {
    return Response.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  const { data: bot, error: botErr } = await admin
    .from('chat_bots')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (botErr || !bot) {
    return Response.json({ ok: false, error: 'Unauthorized — invalid bot token' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const chatId = body.chat_id || body.channel_id;
  const text = body.text || body.content;
  if (!chatId || !text) {
    return Response.json({ ok: false, error: 'chat_id and text required' }, { status: 400 });
  }

  const { data: msg, error } = await admin
    .from('chat_messages')
    .insert({
      channel_id: chatId,
      user_id: bot.owner_id,
      author_name: bot.name,
      content: String(text).slice(0, 4000),
      is_ai: false,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }

  // Optional webhook notify (fire-and-forget)
  if (bot.webhook_url) {
    fetch(bot.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message_sent', bot_id: bot.id, message: msg }),
    }).catch(() => {});
  }

  return Response.json({ ok: true, result: msg });
}
