import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import { createBot } from './bot.js';
import { createHealthMonitor } from './health.js';
import { attachWebSocketServer } from './ws.js';

const PORT = process.env.PORT || 8787;
const {
  TELEGRAM_BOT_TOKEN,
  WEB_APP_URL,
  INTERNAL_SHARED_SECRET,
  DATABASE_URL
} = process.env;

const app = express();
app.use(express.json());

const botConfigured = Boolean(TELEGRAM_BOT_TOKEN && WEB_APP_URL && INTERNAL_SHARED_SECRET);
const healthMonitor = createHealthMonitor({ databaseUrl: DATABASE_URL, botConfigured });
healthMonitor.start();

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    checks: healthMonitor.snapshot()
  });
});

// Readiness is intentionally separate from liveness. Hosts can use /health to
// keep the process alive while /ready tells dashboards and alerts whether the
// configured database dependency is actually responding.
app.get('/ready', (_req, res) => {
  const checks = healthMonitor.snapshot();
  const ready = checks.database === 'healthy';
  res.status(ready ? 200 : 503).json({ ok: ready, checks });
});

const server = http.createServer(app);
const ws = attachWebSocketServer(server, { databaseUrl: DATABASE_URL });

// Called by the Next.js app's /api/votes route right after it writes a vote,
// so connected clients see the update immediately rather than waiting for
// the WS server's own polling interval.
app.post('/internal/broadcast', (req, res) => {
  if (!INTERNAL_SHARED_SECRET || req.headers['x-internal-secret'] !== INTERNAL_SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.body?.type === 'vote') ws.notifyVote();
  res.json({ ok: true });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on :${PORT} (health: /health, ws: /live)`);
});

if (TELEGRAM_BOT_TOKEN && WEB_APP_URL && INTERNAL_SHARED_SECRET) {
  const bot = createBot({ token: TELEGRAM_BOT_TOKEN, webAppUrl: WEB_APP_URL, internalSecret: INTERNAL_SHARED_SECRET });
  bot.launch();
  // eslint-disable-next-line no-console
  console.log('[server] Telegram bot launched (long polling)');
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  // eslint-disable-next-line no-console
  console.log(
    '[server] Telegram bot NOT started — set TELEGRAM_BOT_TOKEN, WEB_APP_URL and INTERNAL_SHARED_SECRET in server/.env to enable it. ' +
    'The WebSocket live-poll server still runs without it.'
  );
}

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[server] received ${signal}; shutting down`);
  await healthMonitor.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
