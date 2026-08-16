import './env.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { sessions } from './routes/sessions.js';
import { cards } from './routes/cards.js';
import { recallRoute } from './routes/recall.js';
import { player } from './routes/player.js';
import { usage } from './routes/usage.js';
import { credentials } from './routes/credentials.js';
import { account } from './routes/account.js';
import { requireUser, type AppEnv } from './auth/require-user.js';
import { webApp, webAppAvailable } from './routes/web-app.js';

const app = new Hono<AppEnv>();

// Answers before authentication and without touching the database, so a health
// check says "the process is up and serving" and nothing more.
app.get('/healthz', c => c.text('ok'));

// Everything under /api belongs to a signed-in account. Applied here rather
// than per route so a new route cannot forget it.
app.use('/api/*', requireUser);

app.route('/api/sessions', sessions);
app.route('/api/cards', cards);
app.route('/api/recall', recallRoute);
app.route('/api/player', player);
app.route('/api/usage', usage);
app.route('/api/credentials', credentials);
app.route('/api/account', account);

// After the API, so /api/* is never mistaken for a page. Without a build (a
// bare API deployment, or the compiled server run from a checkout) the root
// says where the app actually is.
if (webAppAvailable) {
  app.route('/', webApp);
} else {
  app.get('/', c =>
    c.text(
      '音楽想起エンジンの API です。アプリは http://localhost:5173 を開いてください。'
    )
  );
}

app.onError((err, c) => {
  console.error('[music-recall]', err);
  return c.json({ error: err.message }, 500);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`[music-recall] api ready on http://localhost:${port}`);
