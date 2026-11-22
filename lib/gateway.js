// Call AI Gateway Hub (same backend as ub-mauve.vercel.app)
export async function chatCompletion({ apiKey, messages, model = 'llama-3.3-70b-versatile', stream = false }) {
  const base = (process.env.NEXT_PUBLIC_GATEWAY_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('NEXT_PUBLIC_GATEWAY_URL is not set');
  if (!apiKey) throw new Error('Gateway API key missing. Add it in Settings.');

  const res = await fetch(`${base}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Gateway error ${res.status}`);
  }
  return res.json();
}
