import { WebSocketServer } from 'ws';
import pg from 'pg';

const PILLAR_IDS = ['finance', 'technology', 'capacity', 'trade', 'systemic'];

/**
 * Broadcasts live poll tallies to every connected browser. Two ways a tally
 * update reaches clients:
 *   - The Next.js app's POST /api/votes calls POST /internal/broadcast here
 *     immediately after writing the vote (see index.js).
 *   - A slow poll of the database every REFRESH_MS as a correctness backstop,
 *     in case a broadcast call is dropped.
 */
export function attachWebSocketServer(httpServer, { databaseUrl }) {
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });
  const pool = databaseUrl ? new pg.Pool({ connectionString: databaseUrl, max: 3 }) : null;

  let lastTally = Object.fromEntries(PILLAR_IDS.map((id) => [id, 0]));

  async function refreshFromDb() {
    if (!pool) return;
    try {
      const { rows } = await pool.query('SELECT pillar_id, COUNT(*)::int AS count FROM audience_votes GROUP BY pillar_id');
      const tally = Object.fromEntries(PILLAR_IDS.map((id) => [id, 0]));
      for (const row of rows) tally[row.pillar_id] = row.count;
      lastTally = tally;
      broadcast();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ws] tally refresh failed:', err.message);
    }
  }

  function broadcast() {
    const payload = JSON.stringify({ type: 'tally', tally: lastTally });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  }

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'tally', tally: lastTally }));
  });

  refreshFromDb();
  const REFRESH_MS = 15_000;
  const interval = setInterval(refreshFromDb, REFRESH_MS);
  wss.on('close', () => clearInterval(interval));

  return {
    /** Called by index.js's /internal/broadcast route after a new vote is written. */
    notifyVote() {
      refreshFromDb();
    }
  };
}
