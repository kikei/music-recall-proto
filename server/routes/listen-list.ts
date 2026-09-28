import { Hono } from 'hono';
import {
  deleteListenItem,
  getListenItemByPublicId,
  listListenItems,
} from '../db/listen-items.js';
import { addListenItem } from '../listen-list/add.js';
import { listenItemToClient } from '../listen-list/to-client.js';
import { INVALID_JSON_MESSAGE, readJsonObject } from './json-body.js';
import {
  requireProjectMember,
  type ProjectRouteEnv,
} from './project-context.js';

// Songs the account wants to listen to later. Always the caller's own: other
// members of the project never see them.
export const listenList = new Hono<ProjectRouteEnv>();

listenList.use('*', requireProjectMember);

listenList.get('/', c =>
  c.json(
    listListenItems(c.get('project').id, c.get('userId')).map(
      listenItemToClient
    )
  )
);

// Body: { text } -- a player link or plain text.
listenList.post('/', async c => {
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  if (typeof body.text !== 'string') {
    return c.json({ error: '聴きたい曲の入力形式が正しくありません。' }, 400);
  }
  const { item, duplicate } = await addListenItem(
    c.get('project').id,
    c.get('userId'),
    body.text
  );
  return c.json({ ...listenItemToClient(item), duplicate });
});

listenList.delete('/:id', c => {
  const userId = c.get('userId');
  const item = getListenItemByPublicId(
    c.get('project').id,
    c.req.param('id'),
    userId
  );
  if (!item) return c.json({ error: 'not found' }, 404);
  deleteListenItem(item.id, userId);
  return c.json({ ok: true });
});
