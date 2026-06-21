import './env.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { sessions } from './routes/sessions.js';
import { cards } from './routes/cards.js';
import { recallRoute } from './routes/recall.js';
import { player } from './routes/player.js';

const app = new Hono();

// This is API-only. The browser should open Vite (default :5173).
app.get('/', c =>
  c.text(
    '音楽想起エンジンの API です。アプリは http://localhost:5173 を開いてください。'
  )
);

app.route('/api/sessions', sessions);
app.route('/api/cards', cards);
app.route('/api/recall', recallRoute);
app.route('/api/player', player);

app.onError((err, c) => {
  console.error('[music-recall]', err);
  return c.json({ error: err.message }, 500);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`[music-recall] api ready on http://localhost:${port}`);
