'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';

function makeToken() {
  const part = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  // Format similar to Telegram: number:secret
  const id = Math.floor(1e9 + Math.random() * 9e9);
  return `${id}:${part()}${part()}`;
}

export default function BotFather() {
  const [user, setUser] = useState(null);
  const [bots, setBots] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [desc, setDesc] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [msg, setMsg] = useState('');
  const [commandsText, setCommandsText] = useState('/start - Start the bot\n/help - Help');

  async function load(uid) {
    const { data } = await sb()
      .from('chat_bots')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false });
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
    if (!user) return;
    const uname = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (!uname.endsWith('bot') && !uname.includes('bot')) {
      // soft rule like Telegram
    }
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
        username: uname || `bot_${Date.now()}`,
        description: desc,
        token,
        commands,
      })
      .select()
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }
    setNewToken(token);
    setMsg('Bot created. Copy the token now — treat it like a password.');
    setName('');
    setUsername('');
    load(user.id);
  }

  async function revoke(id) {
    if (!confirm('Delete this bot and invalidate its token?')) return;
    await sb().from('chat_bots').delete().eq('id', id);
    if (user) load(user.id);
  }

  return (
    <div style={wrap}>
      <nav style={nav}>
        <Link href="/app">← Chat</Link>
        <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
        <Link href="/friends">Friends</Link>
        <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
        <Link href="/settings">Settings</Link>
      </nav>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>🤖 BotFather</h1>
        <p style={{ color: '#949ba4', marginTop: 8 }}>
          Create bots for <strong>Jilowa Chat</strong> (this platform). You get a real bot token for our Bot API.
          This is not the official Telegram or Discord BotFather — those require their own developer accounts.
        </p>
      </header>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>/newbot</h2>
        <form onSubmit={createBot}>
          <label style={label}>Bot name (display)</label>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Support Bot" required />
          <label style={label}>Username (unique)</label>
          <input
            style={input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="support_bot"
            required
          />
          <label style={label}>Description</label>
          <input style={input} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Helps users…" />
          <label style={label}>Commands (one per line: /cmd - description)</label>
          <textarea style={{ ...input, minHeight: 90 }} value={commandsText} onChange={(e) => setCommandsText(e.target.value)} />
          <button type="submit" style={btn}>
            Create bot &amp; generate token
          </button>
        </form>
        {msg && <p style={{ color: newToken ? '#23a559' : '#f23f43' }}>{msg}</p>}
        {newToken && (
          <div style={tokenBox}>
            <div style={{ fontSize: 12, color: '#949ba4' }}>HTTP API token (copy once)</div>
            <code style={{ wordBreak: 'break-all' }}>{newToken}</code>
            <p style={{ fontSize: 13, color: '#949ba4', marginBottom: 0 }}>
              Send messages: <code>POST /api/bot/&#123;token&#125;/sendMessage</code>
            </p>
          </div>
        )}
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Your bots</h2>
        {bots.length === 0 && <p style={{ color: '#949ba4' }}>No bots yet. Use /newbot above.</p>}
        {bots.map((b) => (
          <div key={b.id} style={botRow}>
            <div>
              <strong>{b.name}</strong>{' '}
              <span style={{ color: '#949ba4' }}>@{b.username}</span>
              <div style={{ fontSize: 12, color: '#949ba4', marginTop: 4 }}>
                Token: <code>{b.token.slice(0, 12)}…</code>
                {Array.isArray(b.commands) && b.commands.length > 0 && (
                  <span> · {b.commands.length} commands</span>
                )}
              </div>
            </div>
            <button type="button" style={danger} onClick={() => revoke(b.id)}>
              Delete
            </button>
          </div>
        ))}
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Commands reference</h2>
        <ul style={{ color: '#949ba4', lineHeight: 1.7 }}>
          <li><code>/newbot</code> — create a bot (form above)</li>
          <li><code>/mybots</code> — list your bots</li>
          <li><code>/setcommands</code> — edit commands when creating</li>
          <li><code>/deletebot</code> — delete button on each bot</li>
        </ul>
      </section>
    </div>
  );
}

const wrap = { maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px', color: '#f2f3f5' };
const nav = { marginBottom: 20, fontSize: 14 };
const card = {
  background: '#2b2d31',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};
const label = { display: 'block', fontSize: 12, color: '#949ba4', marginTop: 12, marginBottom: 4 };
const input = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,.08)',
  background: '#1e1f22',
  color: '#f2f3f5',
};
const btn = {
  marginTop: 16,
  width: '100%',
  padding: 12,
  border: 0,
  borderRadius: 8,
  background: '#5865f2',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};
const tokenBox = {
  marginTop: 12,
  padding: 14,
  borderRadius: 8,
  background: '#1e1f22',
  border: '1px solid #23a559',
};
const botRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,.06)',
};
const danger = {
  border: 0,
  background: 'rgba(242,63,67,.15)',
  color: '#f23f43',
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
};
