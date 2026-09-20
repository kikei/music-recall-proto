import { Hono } from 'hono';
import { deleteUserAccount, getUser, setDisplayName } from '../db/users.js';
import { checkDisplayName } from '../accounts/display-name.js';
import type { AppEnv } from '../auth/require-user.js';
import { INVALID_JSON_MESSAGE, readJsonObject } from './json-body.js';

export const account = new Hono<AppEnv>();

// The account as this app knows it: just the name shown in the UI. Everything
// else about the person stays with the identity provider.
account.get('/', c => {
  const user = getUser(c.get('userId'));
  if (!user) throw new Error('認証済みアカウントがデータベースにありません。');
  return c.json({ displayName: user.display_name });
});

account.patch('/', async c => {
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  const { displayName } = body;
  if (typeof displayName !== 'string') {
    return c.json({ error: '名前を入力してください' }, 400);
  }
  const checked = checkDisplayName(displayName);
  if ('error' in checked) return c.json({ error: checked.error }, 400);

  const user = setDisplayName(c.get('userId'), checked.displayName);
  if (!user) throw new Error('認証済みアカウントがデータベースにありません。');
  return c.json({ displayName: user.display_name });
});

account.delete('/', c => {
  if (!deleteUserAccount(c.get('userId'))) {
    return c.json({ error: 'not found' }, 404);
  }
  return c.json({ ok: true });
});
