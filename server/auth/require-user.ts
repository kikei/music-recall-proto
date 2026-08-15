import type { MiddlewareHandler } from 'hono';
import { oidcVerifier } from './oidc-verifier.js';
import { runWithUser } from './request-context.js';
import { findOrCreateUser } from '../db/users.js';

// Every route carries the signed-in account id. Declared here so routes can be
// typed as Hono<AppEnv> and read c.get('userId') safely.
export interface AppEnv {
  Variables: { userId: string };
}

// Gate for the whole API. There is deliberately no development bypass: a flag
// that skips authentication is the kind of thing that ends up enabled in
// production. Point OIDC_ISSUER at a development tenant instead.
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return c.json({ error: 'ログインが必要です' }, 401);
  }

  let subject: string;
  try {
    subject = (await oidcVerifier.verify(token)).subject;
  } catch {
    // Do not echo the reason: it would tell an attacker how the token failed.
    return c.json({ error: 'ログインし直してください' }, 401);
  }

  const user = findOrCreateUser(subject);
  c.set('userId', user.id);
  return runWithUser(user.id, () => next());
};
