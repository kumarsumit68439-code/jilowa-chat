/**
 * Optional: receive webhooks on your VPS (Telegram-style).
 * Register: POST /api/bot/{token}/setWebhook  { "url": "https://your-vps/jilowa-hook" }
 */
import 'dotenv/config';
import http from 'http';

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.BOT_TOKEN;
const API = (process.env.API_BASE || '').replace(/\/$/, '');

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/jilowa-hook') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try {
      const update = JSON.parse(raw || '{}');
      console.log('Update:', update);

      // Echo example
      if (update.text && update.chat_id && TOKEN && API) {
        await fetch(`${API}/api/bot/${TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: update.chat_id,
            text: `Echo: ${update.text}`,
          }),
        });
      }
    } catch (e) {
      console.error(e);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(200);
  res.end('Jilowa bot webhook host');
});

server.listen(PORT, () => {
  console.log(`Webhook listening on :${PORT}/jilowa-hook`);
});
