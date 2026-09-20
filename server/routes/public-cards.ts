import { Hono } from 'hono';
import { getPublicCard } from '../db/cards.js';
import { cardToPublic } from '../cards/to-client.js';

export const publicCards = new Hono();

publicCards.get('/:projectSlug/cards/:cardId', c => {
  const card = getPublicCard(c.req.param('projectSlug'), c.req.param('cardId'));
  // A private card is indistinguishable from a missing one.
  return card
    ? c.json(cardToPublic(card))
    : c.json({ error: 'not found' }, 404);
});
