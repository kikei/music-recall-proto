import { Hono } from 'hono';
import { getUser, setDisplayName } from '../db/users.js';
import { checkDisplayName } from '../accounts/display-name.js';
import type { AppEnv } from '../auth/require-user.js';

export const account = new Hono<AppEnv>();

// The account as this app knows it: just the name shown in the UI. Everything
// else about the person stays with the identity provider.
account.get('/', c => {
  const user = getUser(c.get('userId'));
  return c.json({ displayName: user?.display_name ?? null });
});

account.patch('/', async c => {
  const { displayName } = await c.req.json().catch(() => ({}));
  if (typeof displayName !== 'string') {
    return c.json({ error: '名前を入力してください' }, 400);
  }
  const checked = checkDisplayName(displayName);
  if ('error' in checked) return c.json({ error: checked.error }, 400);

  const user = setDisplayName(c.get('userId'), checked.displayName);
  return c.json({ displayName: user?.display_name ?? null });
});
