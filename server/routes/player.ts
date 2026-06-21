import { Hono } from 'hono';
import { parsePlayerUrl } from '../player/parse-url.js';
import { describePlayer } from '../player/describe-player.js';

export const player = new Hono();

// Look up title and artist from a pasted URL (for the start form's auto-fill).
player.get('/lookup', async c => {
  const parsed = parsePlayerUrl(c.req.query('url') ?? null);
  if (!parsed) return c.json({ error: '対応していない URL です' }, 400);
  const meta = await describePlayer(parsed);
  if (!meta) {
    return c.json({ error: 'メタデータを取得できませんでした' }, 404);
  }
  return c.json(meta);
});
