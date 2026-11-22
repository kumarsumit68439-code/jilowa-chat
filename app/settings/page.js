'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || '';

  useEffect(() => {
    sb().auth.getUser().then(({ data }) => setUser(data?.user || null));
    try {
      setKey(localStorage.getItem('jilowa_gateway_key') || '');
    } catch {}
  }, []);

  function save() {
    localStorage.setItem('jilowa_gateway_key', key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <Link href="/app">← Chat</Link>
        <Link href="/botfather">BotFather</Link>
        <Link href="/friends">Friends</Link>
      </div>
      <h1>Settings</h1>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Account</h3>
        <p style={{ color: '#949ba4', margin: 0 }}>{user?.email || '…'}</p>
        <p style={{ fontSize: 12, color: '#949ba4' }}>User ID: <code>{user?.id || '…'}</code></p>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>AI Gateway</h3>
        <p style={{ fontSize: 13, color: '#949ba4' }}>
          URL: <code>{gatewayUrl || '(set NEXT_PUBLIC_GATEWAY_URL)'}</code>
        </p>
        <label style={{ fontSize: 12, color: '#949ba4' }}>Gateway API key (sk-gw-…)</label>
        <input
          style={input}
          type="password"
          placeholder="sk-gw-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button type="button" style={btn} onClick={save}>
          {saved ? 'Saved ✓' : 'Save key'}
        </button>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Bots</h3>
        <p style={{ fontSize: 13, color: '#949ba4' }}>
          Create platform bots and tokens at <Link href="/botfather">BotFather</Link>.
          API: <code>POST /api/bot/&#123;token&#125;/sendMessage</code>
        </p>
      </section>
    </div>
  );
}

const box = {
  marginTop: 20,
  padding: 20,
  borderRadius: 12,
  background: '#2b2d31',
  border: '1px solid rgba(255,255,255,.06)',
};
const input = {
  width: '100%',
  marginTop: 6,
  marginBottom: 8,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,.08)',
  background: '#1e1f22',
  color: '#f2f3f5',
};
const btn = {
  padding: '10px 18px',
  border: 0,
  borderRadius: 8,
  background: '#5865f2',
  color: '#fff',
  fontWeight: 600,
};
