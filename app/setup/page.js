export default function Setup() {
  return (
    <div style={{ maxWidth: 640, margin: '48px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>Jilowa Chat — setup required</h1>
      <p style={{ color: '#949ba4' }}>
        Middleware could not start because Supabase env vars are missing on this deployment.
        That is why you saw <code>MIDDLEWARE_INVOCATION_FAILED</code>.
      </p>
      <h3>Fix on Vercel</h3>
      <ol>
        <li>Open your Vercel project → Settings → Environment Variables</li>
        <li>Add (same values as AI Gateway Hub if you share Supabase):</li>
      </ol>
      <pre style={{ background: '#1e1f22', padding: 16, borderRadius: 8, overflow: 'auto' }}>
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_GATEWAY_URL=https://ub-mauve.vercel.app`}
      </pre>
      <ol start={3}>
        <li>Redeploy the project</li>
        <li>In Supabase SQL Editor, run <code>supabase/schema.sql</code> from this repo</li>
      </ol>
      <p>
        After env is set, open <a href="/login">/login</a>.
      </p>
    </div>
  );
}
