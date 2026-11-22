'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';

export default function Friends() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [friends, setFriends] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    sb().auth.getUser().then(async ({ data }) => {
      const u = data?.user;
      setUser(u || null);
      if (!u) return;
      const { data: rows } = await sb()
        .from('chat_friends')
        .select('*')
        .or(`user_id.eq.${u.id},friend_id.eq.${u.id}`);
      setFriends(rows || []);
    });
  }, []);

  async function addFriend(e) {
    e.preventDefault();
    setMsg('');
    // Lookup by email is not exposed via client without a profile table;
    // store request by email string in description path: we use friend_id only when known.
    // Simple approach: user pastes friend user UUID from their profile, or we store pending by email in a note.
    setMsg(
      'Ask your friend for their User ID from Settings, or share yours. Full email search needs a profiles table (add later).'
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <Link href="/app">← Chat</Link>
      <h1>Friends</h1>
      <p style={{ color: '#949ba4' }}>Telegram-style contacts list (basic).</p>
      <form onSubmit={addFriend} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={inp}
          placeholder="Friend email or user id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" style={btn}>
          Add
        </button>
      </form>
      {msg && <p style={{ color: '#fbbf24' }}>{msg}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {friends.map((f, i) => (
          <li key={i} style={{ padding: 12, background: '#2b2d31', borderRadius: 8, marginBottom: 8 }}>
            {f.user_id} ↔ {f.friend_id} · {f.status}
          </li>
        ))}
        {friends.length === 0 && <li style={{ color: '#949ba4' }}>No friend rows yet.</li>}
      </ul>
      <p>
        <Link href="/botfather">Open BotFather →</Link>
      </p>
    </div>
  );
}

const inp = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,.08)',
  background: '#1e1f22',
  color: '#fff',
};
const btn = {
  padding: '10px 16px',
  border: 0,
  borderRadius: 8,
  background: '#5865f2',
  color: '#fff',
  fontWeight: 600,
};
