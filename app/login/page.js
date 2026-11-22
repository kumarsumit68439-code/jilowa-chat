'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase-browser';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const auth = sb().auth;
    if (mode === 'login') {
      const { error } = await auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(error.message);
        setBusy(false);
        return;
      }
      window.location.href = '/app';
      return;
    }
    const { data, error } = await auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else if (data.session) window.location.href = '/app';
    else setMsg('Account created. Confirm email if required, then log in.');
    setBusy(false);
  }

  async function oauth(provider) {
    setOauthBusy(provider);
    setMsg('');
    const origin = window.location.origin;
    const { error } = await sb().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setMsg(
        error.message +
          (provider === 'discord'
            ? ' — Enable Discord provider in Supabase → Authentication → Providers.'
            : '')
      );
      setOauthBusy('');
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.bgOrbs} aria-hidden>
        <i /><i /><i />
      </div>

      <div className="fade-in" style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>JC</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Welcome back!</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--mute)', fontSize: 14 }}>
              We&apos;re so excited to see you again!
            </p>
          </div>
        </div>

        <button
          type="button"
          style={{ ...styles.oauth, background: '#5865F2' }}
          disabled={!!oauthBusy || busy}
          onClick={() => oauth('discord')}
        >
          <DiscordIcon />
          {oauthBusy === 'discord' ? 'Redirecting…' : 'Continue with Discord'}
        </button>

        <button
          type="button"
          style={{ ...styles.oauth, background: '#fff', color: '#1f1f1f' }}
          disabled={!!oauthBusy || busy}
          onClick={() => oauth('google')}
        >
          <GoogleIcon />
          {oauthBusy === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div style={styles.or}>
          <span>or</span>
        </div>

        <form onSubmit={submit}>
          <label style={styles.label}>EMAIL</label>
          <input
            style={styles.input}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <label style={styles.label}>PASSWORD</label>
          <input
            style={styles.input}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button style={styles.btn} disabled={busy || !!oauthBusy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {msg && (
          <p style={{ color: msg.includes('created') ? 'var(--green)' : 'var(--danger)', fontSize: 13 }}>
            {msg}
          </p>
        )}

        <p style={{ color: 'var(--mute)', fontSize: 14, marginBottom: 0 }}>
          {mode === 'login' ? 'Need an account? ' : 'Already have an account? '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === 'login' ? 'signup' : 'login');
              setMsg('');
            }}
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            {mode === 'login' ? 'Register' : 'Log In'}
          </a>
        </p>
      </div>

      <p className="fade-in" style={{ color: 'var(--mute)', fontSize: 12, marginTop: 20, zIndex: 1 }}>
        Jilowa Chat · Connected to AI Gateway Hub
      </p>

      <style jsx global>{`
        @keyframes orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
        }
      `}</style>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.07.07 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.3C9.7 35.7 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 44 31.5 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(145deg, #1a1b1e 0%, #2b2d31 40%, #1e1f22 100%)',
  },
  bgOrbs: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  card: {
    width: 'min(440px, 100%)',
    padding: 32,
    borderRadius: 12,
    background: 'rgba(49, 51, 56, 0.92)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
    backdropFilter: 'blur(20px)',
    zIndex: 1,
  },
  logoRow: { display: 'flex', gap: 14, alignItems: 'center', marginBottom: 22 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #5865f2, #00d4ff)',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 800,
    fontSize: 16,
    animation: 'floaty 4s ease-in-out infinite',
    boxShadow: '0 0 24px rgba(88,101,242,0.5)',
  },
  oauth: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '11px 14px',
    marginBottom: 10,
    border: 0,
    borderRadius: 8,
    color: '#fff',
    fontWeight: 600,
    transition: 'transform .15s, filter .15s',
  },
  or: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '14px 0',
    color: 'var(--mute)',
    fontSize: 12,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: 'var(--mute)',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    width: '100%',
    padding: '11px 12px',
    borderRadius: 8,
    border: '1px solid transparent',
    background: '#1e1f22',
    color: 'var(--text)',
    outline: 'none',
  },
  btn: {
    width: '100%',
    marginTop: 18,
    padding: 12,
    border: 0,
    borderRadius: 8,
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 600,
    animation: 'pulseGlow 2.5s ease-in-out infinite',
  },
};
