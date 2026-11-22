import { createClient } from '@supabase/supabase-js';

// POST { "url": "https://your-vps.example/jilowa-hook" }
export async function POST(req, { params }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ ok: false, error: 'Server not configured' }, { status: 500 });

  const admin = createClient(url, key);
  const { data: bot } = await admin
    .from('chat_bots')
    .select('id, token')
    .eq('token', params.token)
    .eq('is_active', true)
    .maybeSingle();

  if (!bot) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookUrl = (body.url || '').trim();
  if (webhookUrl && !/^https:\/\//i.test(webhookUrl)) {
    return Response.json({ ok: false, error: 'url must be https' }, { status: 400 });
  }

  const { error } = await admin
    .from('chat_bots')
    .update({ webhook_url: webhookUrl || null })
    .eq('id', bot.id);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
  return Response.json({ ok: true, result: { url: webhookUrl || null } });
}
