'use client';
import Link from 'next/link';

const cards = [
  { t: 'Gaming', d: 'Find communities for your games', icon: '🎮', c: '#5865f2' },
  { t: 'Music', d: 'Share tracks and playlists', icon: '🎵', c: '#1db954' },
  { t: 'Education', d: 'Study groups and tutors', icon: '📚', c: '#faa61a' },
  { t: 'Science & Tech', d: 'AI, coding, hardware', icon: '🔬', c: '#00d4ff' },
  { t: 'Anime', d: 'Fans and watch parties', icon: '✨', c: '#ff73fa' },
  { t: 'AI Gateway', d: 'Chat powered by your gateway', icon: '⚡', c: '#7c5cff' },
];

export default function Discover() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflow: 'auto' }}>
      <header
        style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          background: 'var(--bg2)',
        }}
      >
        <Link href="/app" style={{ color: 'var(--mute)' }}>
          ← Back
        </Link>
        <h1 style={{ margin: 0, fontSize: 20 }}>Discover</h1>
      </header>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 28 }} className="fade-in">
        <div
          className="premium-border"
          style={{ marginBottom: 28 }}
        >
          <div className="premium-inner">
            <h2 style={{ margin: '0 0 8px' }}>Explore communities</h2>
            <p style={{ margin: 0, color: 'var(--mute)' }}>
              Discord-style discovery. Join servers from chat or create your own in the app.
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {cards.map((c) => (
            <div
              key={c.t}
              style={{
                background: 'var(--bg2)',
                borderRadius: 12,
                padding: 20,
                border: '1px solid var(--line)',
                transition: 'transform .2s, border-color .2s',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: c.c,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 24,
                  marginBottom: 12,
                }}
              >
                {c.icon}
              </div>
              <b>{c.t}</b>
              <p style={{ color: 'var(--mute)', fontSize: 13, margin: '6px 0 0' }}>{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
