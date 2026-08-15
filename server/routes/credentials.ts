import { Hono } from 'hono';
import {
  listCredentialStatus,
  setCredential,
  clearCredential,
  isCredentialKind,
} from '../db/credentials.js';
import type { AppEnv } from '../auth/require-user.js';

export const credentials = new Hono<AppEnv>();

// Which keys this account has set. Never returns a stored key: there is no
// reason for the browser to receive one back, and not sending it means a
// compromised session cannot be used to harvest keys.
credentials.get('/', c => c.json(listCredentialStatus(c.get('userId'))));

credentials.put('/:kind', async c => {
  const kind = c.req.param('kind');
  if (!isCredentialKind(kind)) {
    return c.json({ error: '未知のキーの種類です' }, 400);
  }
  const { secret } = await c.req.json().catch(() => ({}));
  if (typeof secret !== 'string' || !secret.trim()) {
    return c.json({ error: 'キーを入力してください' }, 400);
  }
  try {
    setCredential(c.get('userId'), kind, secret.trim());
  } catch (e) {
    // Surfaces a missing or malformed CREDENTIAL_SECRET, which is a server
    // setup problem rather than something the person entered.
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
  return c.json(listCredentialStatus(c.get('userId')));
});

credentials.delete('/:kind', c => {
  const kind = c.req.param('kind');
  if (!isCredentialKind(kind)) {
    return c.json({ error: '未知のキーの種類です' }, 400);
  }
  clearCredential(c.get('userId'), kind);
  return c.json(listCredentialStatus(c.get('userId')));
});
