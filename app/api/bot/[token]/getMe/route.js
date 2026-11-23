import { createClient } from '@supabase/supabase-js';

export async function GET(_req, { params }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const token = decodeURIComponent(params.token || '');

  const { data: bot } = await admin
    .from('chat_bots')
    .select('id, name, username, description, commands, is_active, created_at')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (!bot) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ ok: true, result: bot });
}
