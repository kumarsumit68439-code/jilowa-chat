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
      <Link href="/app" style={{ color: 'var(--mute)' }}>← Back to chat</Link>
      <h1 style={{ marginTop: 16 }}>Settings</h1>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Account</h3>
        <p style={{ color: 'var(--mute)', margin: 0 }}>{user?.email || '…'}</p>
        <p style={{ fontSize: 13, color: 'var(--mute)' }}>
          Same Supabase project as AI Gateway Hub — one account for both sites when env matches.
        </p>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>AI Gateway connection</h3>
        <p style={{ fontSize: 13, color: 'var(--mute)' }}>
          Gateway URL: <code>{gatewayUrl || '(set NEXT_PUBLIC_GATEWAY_URL)'}</code>
        </p>
        <label style={{ fontSize: 12, color: 'var(--mute)' }}>Your gateway API key (sk-gw-…)</label>
        <input
          style={input}
          type="password"
          placeholder="sk-gw-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>
          Create a key on the Gateway site → Gateway keys, then paste it here. AI channels use this key.
        </p>
        <button type="button" style={btn} onClick={save}>
          {saved ? 'Saved ✓' : 'Save key'}
        </button>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Realtime</h3>
        <p style={{ fontSize: 13, color: 'var(--mute)', margin: 0 }}>
          Messages use Supabase Realtime on table <code>chat_messages</code>. Run{' '}
          <code>supabase/schema.sql</code> once in the Supabase SQL editor.
        </p>
      </section>
    </div>
  );
}

const box = {
  marginTop: 20,
  padding: 20,
  borderRadius: 12,
  background: 'var(--bg3)',
  border: '1px solid var(--line)',
};
const input = {
  width: '100%',
  marginTop: 6,
  marginBottom: 8,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'var(--bg)',
  color: 'var(--text)',
};
const btn = {
  padding: '10px 18px',
  border: 0,
  borderRadius: 8,
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 600,
};
