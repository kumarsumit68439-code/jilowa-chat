'use client';
import Link from 'next/link';

export default function Nitro() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflow: 'auto' }}>
      <header style={{ padding: '20px 28px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link href="/app" style={{ color: 'var(--mute)' }}>
          ← Back
        </Link>
      </header>
      <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto', padding: 28, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 99,
            background: 'var(--nitro)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 3s linear infinite',
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          JILOWA PREMIUM
        </div>
        <h1 style={{ fontSize: 36, margin: '0 0 12px' }}>Unleash more fun</h1>
        <p style={{ color: 'var(--mute)', fontSize: 17 }}>
          Premium theme, higher limits, and AI channel boosts — design inspired by Nitro.
          Billing not connected yet; this is a showcase page.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginTop: 32,
            textAlign: 'left',
          }}
        >
          {[
            ['Animated avatar', 'Profile flair in chat'],
            ['Bigger uploads', 'When file upload ships'],
            ['AI priority', 'Faster gateway queues'],
            ['Custom themes', 'More accent colors'],
          ].map(([t, d]) => (
            <div
              key={t}
              style={{
                background: 'var(--bg2)',
                padding: 18,
                borderRadius: 12,
                border: '1px solid var(--line)',
              }}
            >
              <b>{t}</b>
              <p style={{ margin: '6px 0 0', color: 'var(--mute)', fontSize: 13 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
