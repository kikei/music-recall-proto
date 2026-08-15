import { randomUUID } from 'node:crypto';
import { db } from './open.js';
import { generateDisplayName } from '../accounts/display-name.js';

// An account, keyed by the identity provider's subject. The provider's profile
// (real name, email, avatar) is deliberately not copied here. The only name
// this app holds is a display name, which starts out generated and is the
// person's to change -- it need not say anything about who they are, and
// nothing resolves or routes by it.
export interface User {
  id: string;
  subject: string;
  display_name: string;
  created_at: string;
}

export function getUser(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | User
    | undefined;
}

export function findOrCreateUser(subject: string): User {
  const found = db
    .prepare('SELECT * FROM users WHERE subject = ?')
    .get(subject);
  if (found) return found as User;

  const user: User = {
    id: randomUUID(),
    subject,
    display_name: generateDisplayName(),
    created_at: new Date().toISOString(),
  };
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, subject, display_name, created_at)
       VALUES (@id, @subject, @display_name, @created_at)`
    ).run(user);
    claimOwnerlessRows(user.id);
  });
  tx();
  return user;
}

export function setDisplayName(
  id: string,
  displayName: string
): User | undefined {
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(
    displayName,
    id
  );
  return getUser(id);
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
