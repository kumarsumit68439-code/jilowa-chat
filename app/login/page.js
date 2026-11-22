'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase-browser';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const auth = sb().auth;
    if (mode === 'login') {
      const { error } = await auth.signInWithPassword({ email, password });
      if (error) { setMsg(error.message); setBusy(false); return; }
      window.location.href = '/app';
      return;
    }
    const { data, error } = await auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else if (data.session) window.location.href = '/app';
    else setMsg('Account created. Confirm email if required, then log in.');
    setBusy(false);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>💬</div>
        <h1 style={{ margin: '0 0 4px' }}>Jilowa Chat</h1>
        <p style={{ color: 'var(--mute)', marginTop: 0 }}>Connected to AI Gateway Hub · Real-time</p>
        <form onSubmit={submit}>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={styles.btn} disabled={busy}>{busy ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        </form>
        {msg && <p style={{ color: msg.includes('created') ? 'var(--accent2)' : 'var(--danger)' }}>{msg}</p>}
        <p style={{ color: 'var(--mute)', fontSize: 14 }}>
          {mode === 'login' ? 'New? ' : 'Have an account? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>
            {mode === 'login' ? 'Create account' : 'Log in'}
          </a>
        </p>
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>
          Use the same email as AI Gateway Hub for a shared account.
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#1e1f22,#2b2d31)' },
  card: { width: 'min(400px, 92vw)', padding: 28, borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--line)' },
  logo: { fontSize: 40, marginBottom: 8 },
  label: { display: 'block', fontSize: 12, color: 'var(--mute)', marginBottom: 4, marginTop: 12 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' },
  btn: { width: '100%', marginTop: 16, padding: 12, border: 0, borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 600 },
};
