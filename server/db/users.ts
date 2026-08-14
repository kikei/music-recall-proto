import { randomUUID } from 'node:crypto';
import { db } from './open.js';

// An account, keyed by the identity provider's subject. Profile details (name,
// email, avatar) are not copied here: the frontend reads them from the provider,
// so this app never becomes a second, stale copy of the person's identity.
export interface User {
  id: string;
  subject: string;
  created_at: string;
}

export function findOrCreateUser(subject: string): User {
  const found = db
    .prepare('SELECT * FROM users WHERE subject = ?')
    .get(subject);
  if (found) return found as User;

  const user: User = {
    id: randomUUID(),
    subject,
    created_at: new Date().toISOString(),
  };
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO users (id, subject, created_at) VALUES (@id, @subject, @created_at)'
    ).run(user);
    claimOwnerlessRows(user.id);
  });
  tx();
  return user;
}

// Rows created before accounts existed have no owner. Each install was
// single-user, so the first account to sign in is that person: give them the
// existing cards and sessions. Only ever runs for the very first account, and a
// fresh install has no such rows, so it does nothing there.
function claimOwnerlessRows(userId: string): void {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as {
    n: number;
  };
  if (n !== 1) return;
  for (const table of ['cards', 'sessions', 'llm_usage']) {
    db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(
      userId
    );
  }
}
