import { Hono } from 'hono';
import {
  listCards,
  getCard,
  bumpRecallCount,
  deleteCard,
} from '../db/cards.js';
import { listMessages } from '../db/messages.js';
import { recallFromCard } from '../cards/recall.js';
import { editCard } from '../cards/edit.js';
import { cardToClient as toClient } from '../cards/to-client.js';

export const cards = new Hono();

cards.get('/', c => {
  return c.json(listCards().map(toClient));
});

cards.get('/:id', c => {
  const card = getCard(c.req.param('id'));
  if (!card) return c.json({ error: 'not found' }, 404);
  return c.json(toClient(card));
});

// Edit from the detail view (hook, recall phrase, background, player URL).
cards.patch('/:id', async c => {
  const body = await c.req.json().catch(() => ({}));
  try {
    const card = await editCard(c.req.param('id'), body);
    if (!card) return c.json({ error: 'not found' }, 404);
    return c.json(toClient(card));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

// Delete a card (its source session and messages are removed too).
cards.delete('/:id', c => {
  const ok = deleteCard(c.req.param('id'));
  if (!ok) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

// Recall starting from this card.
cards.post('/:id/recall', async c => {
  const card = getCard(c.req.param('id'));
  if (!card) return c.json({ error: 'not found' }, 404);
  return c.json(await recallFromCard(card.id));
});

// Increment the reference count when the detail is opened from a recall result.
cards.post('/:id/recall-hit', c => {
  const card = getCard(c.req.param('id'));
  if (!card) return c.json({ error: 'not found' }, 404);
  bumpRecallCount(card.id);
  return c.json({ recall_count: card.recall_count + 1 });
});

// Return the source session's messages for viewing only.
// (Not used for recall search or embeddings.)
cards.get('/:id/transcript', c => {
  const card = getCard(c.req.param('id'));
  if (!card) return c.json({ error: 'not found' }, 404);
  const messages = card.session_id ? listMessages(card.session_id) : [];
  return c.json(messages);
});
