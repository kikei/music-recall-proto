import { Hono } from 'hono';
import {
  listCardsForDisplay,
  getCardByPublicId,
  getEditableCardByPublicId,
  bumpRecallCount,
  deleteCard,
} from '../db/cards.js';
import { listMessages } from '../db/messages.js';
import { recallFromCard } from '../cards/recall.js';
import { recallResultToClient } from '../cards/recall-to-client.js';
import { editCard } from '../cards/edit.js';
import { cardToClient } from '../cards/to-client.js';
import type { CardPatch } from '../cards/edit.js';
import { INVALID_JSON_MESSAGE, readJsonObject } from './json-body.js';
import { isCardCreator } from '../db/card-access.js';
import {
  requireProjectMember,
  type ProjectRouteEnv,
} from './project-context.js';

export const cards = new Hono<ProjectRouteEnv>();

cards.use('*', requireProjectMember);

cards.get('/', c => {
  const project = c.get('project');
  return c.json(
    listCardsForDisplay(project.id, c.get('userId')).map(card =>
      cardToClient(card, project.slug, c.get('userId'))
    )
  );
});

cards.get('/:id', c => {
  const project = c.get('project');
  const card = getCardByPublicId(
    project.id,
    c.req.param('id'),
    c.get('userId')
  );
  return card
    ? c.json(cardToClient(card, project.slug, c.get('userId')))
    : c.json({ error: 'not found' }, 404);
});

cards.patch('/:id', async c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const target = getEditableCardByPublicId(
    project.id,
    c.req.param('id'),
    userId
  );
  if (!target) return c.json({ error: 'not found' }, 404);
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  const stringFields = [
    'title',
    'artist',
    'hook',
    'recall_phrase',
    'background',
    'metadata',
    'playerUrl',
  ] as const;
  if (
    stringFields.some(
      field => body[field] !== undefined && typeof body[field] !== 'string'
    )
  ) {
    return c.json({ error: 'カードの変更内容の形式が正しくありません。' }, 400);
  }
  const patch: CardPatch = {
    title: typeof body.title === 'string' ? body.title : undefined,
    artist: typeof body.artist === 'string' ? body.artist : undefined,
    hook: typeof body.hook === 'string' ? body.hook : undefined,
    recall_phrase:
      typeof body.recall_phrase === 'string' ? body.recall_phrase : undefined,
    background:
      typeof body.background === 'string' ? body.background : undefined,
    metadata: typeof body.metadata === 'string' ? body.metadata : undefined,
    playerUrl: typeof body.playerUrl === 'string' ? body.playerUrl : undefined,
    visibility: body.visibility,
  };
  const card = await editCard(target.id, userId, patch);
  return card
    ? c.json(cardToClient(card, project.slug, userId))
    : c.json({ error: 'not found' }, 404);
});

cards.delete('/:id', c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const card = getEditableCardByPublicId(project.id, c.req.param('id'), userId);
  if (!card || !deleteCard(card.id, userId)) {
    return c.json({ error: 'not found' }, 404);
  }
  return c.json({ ok: true });
});

cards.post('/:id/recall', async c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const card = getCardByPublicId(project.id, c.req.param('id'), userId);
  if (!card) return c.json({ error: 'not found' }, 404);
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  const { direction } = body;
  if (direction !== undefined && typeof direction !== 'string') {
    return c.json({ error: '想起の方向の形式が正しくありません。' }, 400);
  }
  const steer = typeof direction === 'string' ? direction.trim() : '';
  const results = await recallFromCard(
    card.id,
    { projectId: project.id, userId },
    steer || undefined
  );
  return c.json(
    results.map(result => recallResultToClient(result, project.slug))
  );
});

cards.post('/:id/recall-hit', c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const card = getCardByPublicId(project.id, c.req.param('id'), userId);
  if (!card) return c.json({ error: 'not found' }, 404);
  bumpRecallCount(card.id, userId);
  return c.json({ recall_count: card.recall_count + 1 });
});

cards.get('/:id/transcript', c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const card = getCardByPublicId(project.id, c.req.param('id'), userId);
  if (!card) return c.json({ error: 'not found' }, 404);
  // A source transcript is always private to the card's creator.
  if (!isCardCreator(card, userId)) {
    return c.json({ error: 'not found' }, 404);
  }
  return c.json(card.session_id ? listMessages(card.session_id) : []);
});
