import { Hono } from 'hono';
import { recall } from '../cards/recall.js';

export const recallRoute = new Hono();

// Recall past cards from the current cue (an impression or vague words).
recallRoute.post('/', async c => {
  const { query } = await c.req.json();
  if (!query) return c.json({ error: 'きっかけを入力してください' }, 400);
  return c.json(await recall(query));
});
