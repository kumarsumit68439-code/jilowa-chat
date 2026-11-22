/**
 * Jilowa Chat bot — Node.js (long-running process, same idea as discord.js / telegraf)
 * Host on VPS: pm2 start bot.js  OR  docker compose
 */
import 'dotenv/config';

const TOKEN = process.env.BOT_TOKEN;
const API = (process.env.API_BASE || '').replace(/\/$/, '');
const CHAT_ID = process.env.CHAT_ID;

if (!TOKEN || !API) {
  console.error('Set BOT_TOKEN and API_BASE in .env');
  process.exit(1);
}

async function api(method, body) {
  const res = await fetch(`${API}/api/bot/${TOKEN}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || res.statusText);
  }
  return json.result ?? json;
}

async function main() {
  const me = await api('getMe');
  console.log('Bot online:', me.name, '@' + me.username);

  if (CHAT_ID) {
    await api('sendMessage', {
      chat_id: CHAT_ID,
      text: `✅ Node bot host online as ${me.name}`,
    });
    console.log('Sent hello to channel', CHAT_ID);
  } else {
    console.log('No CHAT_ID set — bot is running; set CHAT_ID to post messages.');
  }

  // Keep process alive (on a real bot you would poll updates or use webhook-server.js)
  setInterval(() => {
    console.log('[heartbeat]', new Date().toISOString());
  }, 60_000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
