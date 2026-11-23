'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';

function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const id = Math.floor(1e9 + Math.random() * 8e9);
  return `${id}:${secret}`;
}

export default function BotFather() {
  const [user, setUser] = useState(null);
  const [bots, setBots] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [desc, setDesc] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [commandsText, setCommandsText] = useState('/start - Start the bot\n/help - Help');

  async function load(uid) {
    const { data, error } = await sb()
      .from('chat_bots')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false });
    if (error) {
      setMsg('DB error: ' + error.message + ' — run supabase/schema.sql in Supabase SQL Editor.');
      setBots([]);
      return;
    }
    setBots(data || []);
  }

  useEffect(() => {
    sb().auth.getUser().then(({ data }) => {
      const u = data?.user;
      setUser(u || null);
      if (u) load(u.id);
    });
  }, []);

  async function createBot(e) {
    e.preventDefault();
    setMsg('');
    setNewToken(null);
    if (!user) {
      setMsg('Not logged in');
      return;
    }
    setBusy(true);

    let uname = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (!uname) uname = `bot_${Date.now()}`;
    if (!uname.endsWith('bot')) uname = `${uname}_bot`;

    const token = makeToken();
    const commands = commandsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [cmd, ...rest] = l.split('-');
        return { command: (cmd || '').trim(), description: rest.join('-').trim() };
      });

    const { data, error } = await sb()
      .from('chat_bots')
      .insert({
        owner_id: user.id,
        name: name.trim() || 'My Bot',
        username: uname,
        description: desc,
        token,
        commands,
        is_active: true,
      })
      .select()
      .single();

    setBusy(false);

    if (error) {
      setMsg(
        error.message.includes('relation') || error.code === '42P01'
          ? 'Table chat_bots missing. Open Supabase → SQL Editor → run supabase/schema.sql from the repo.'
          : error.message
      );
      return;
    }

    setNewToken(data.token);
    setMsg('Bot created and saved in Supabase. Token works with /api/bot/{token}/…');
    setName('');
    setUsername('');
    load(user.id);
  }

  async function revoke(id) {
    if (!confirm('Delete this bot and invalidate its token?')) return;
    await sb().from('chat_bots').delete().eq('id', id).eq('owner_id', user.id);
    if (user) load(user.id);
  }

  async function copy(t) {
    try {
      await navigator.clipboard.writeText(t);
      setMsg('Token copied');
    } catch {
      setMsg('Copy manually');
    }
  }

  return (
    <div className="no-scroll" style={shell}>
      <header style={header}>
        <Link href="/app" style={{ color: 'var(--mute)' }}>
          ← Chat
        </Link>
        <strong>BotFather</strong>
        <span style={{ width: 48 }} />
      </header>

      <div className="scroll-y fade-in" style={body}>
        <p style={{ color: 'var(--mute)', fontSize: 14, marginTop: 0 }}>
          Tokens are stored in Supabase table <code>chat_bots</code>. API uses the same backend.
        </p>

        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>/newbot</h2>
          <form onSubmit={createBot}>
            <label style={label}>Bot name</label>
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Support Bot" required />
            <label style={label}>Username</label>
            <input
              style={input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="support_bot"
              required
            />
            <label style={label}>Description</label>
            <input style={input} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <label style={label}>Commands</label>
            <textarea
              style={{ ...input, minHeight: 88, resize: 'vertical' }}
              value={commandsText}
              onChange={(e) => setCommandsText(e.target.value)}
            />
            <button type="submit" style={btn} disabled={busy}>
              {busy ? 'Creating…' : 'Create bot & token'}
            </button>
          </form>
          {msg && (
            <p style={{ color: newToken ? 'var(--green)' : 'var(--danger)', fontSize: 13 }}>{msg}</p>
          )}
          {newToken && (
            <div style={tokenBox}>
              <div style={{ fontSize: 12, color: 'var(--mute)' }}>Your token (save it)</div>
              <code style={{ wordBreak: 'break-all', fontSize: 13 }}>{newToken}</code>
              <button type="button" style={{ ...btn, marginTop: 10 }} onClick={() => copy(newToken)}>
                Copy token
              </button>
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Your bots</h2>
          {bots.length === 0 && <p style={{ color: 'var(--mute)' }}>No bots yet.</p>}
          {bots.map((b) => (
            <div key={b.id} style={botRow}>
              <div style={{ minWidth: 0 }}>
                <strong>{b.name}</strong>{' '}
                <span style={{ color: 'var(--mute)' }}>@{b.username}</span>
                <div style={{ fontSize: 12, color: 'var(--mute)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.token.slice(0, 20)}…
                </div>
              </div>
              <button type="button" style={danger} onClick={() => revoke(b.id)}>
                Delete
              </button>
            </div>
          ))}
        </section>

        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>API test</h2>
          <pre style={pre}>
{`GET  /api/bot/{token}/getMe
POST /api/bot/{token}/sendMessage
{ "chat_id": "<channel-uuid>", "text": "Hello" }`}
          </pre>
          <p style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 0 }}>
            On Vercel also set <code>SUPABASE_SERVICE_ROLE_KEY</code> so bots can post messages reliably.
          </p>
        </section>
      </div>
    </div>
  );
}

const shell = {
  height: '100%',
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  overflow: 'hidden',
};
const header = {
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  paddingTop: 'calc(12px + var(--sat))',
  borderBottom: '1px solid var(--line)',
  background: 'var(--bg2)',
};
const body = {
  flex: 1,
  padding: '16px',
  paddingBottom: 'calc(24px + var(--sab))',
};
const card = {
  background: 'var(--bg2)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
};
const label = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--mute)',
  marginTop: 12,
  marginBottom: 4,
};
const input = {
  width: '100%',
  padding: '12px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'var(--bg)',
  color: 'var(--text)',
};
const btn = {
  marginTop: 14,
  width: '100%',
  padding: 12,
  border: 0,
  borderRadius: 8,
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 600,
};
const tokenBox = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  background: 'var(--bg)',
  border: '1px solid var(--green)',
};
const botRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: '12px 0',
  borderBottom: '1px solid var(--line)',
};
const danger = {
  border: 0,
  background: 'rgba(242,63,67,.15)',
  color: 'var(--danger)',
  padding: '8px 12px',
  borderRadius: 6,
  flex: 'none',
};
const pre = {
  background: 'var(--bg)',
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
  overflow: 'auto',
  margin: 0,
};
