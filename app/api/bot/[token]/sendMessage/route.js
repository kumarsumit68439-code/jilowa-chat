import { createClient } from '@supabase/supabase-js';

// Bot API (platform bots created via BotFather)
// POST /api/bot/{token}/sendMessage  { "chat_id": "channel-uuid", "text": "hello" }

export async function POST(req, { params }) {
  const token = params.token;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !(service || anon)) {
    return Response.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  // Prefer service role so bots can post; fall back to anon (needs RLS insert)
  const admin = createClient(url, service || anon);

  const { data: bot, error: botErr } = await admin
    .from('chat_bots')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (botErr || !bot) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
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
      content: String(text),
      is_ai: false,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, result: msg });
}
