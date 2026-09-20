import { ensurePersonalProject } from '../db/projects.js';
import { db } from '../db/open.js';
import { findOrCreateUser, getUserBySubject, type User } from '../db/users.js';

export function provisionUser(subject: string): User {
  const existingUser = getUserBySubject(subject);
  // Project creation only happens during new account registration. Returning
  // an existing account unchanged leaves missing memberships visible as no
  // projects instead of silently granting unrelated data.
  if (existingUser) return existingUser;

  // The account and its initial project must be committed atomically.
  return db.transaction(() => {
    const created = findOrCreateUser(subject);
    ensurePersonalProject(created.id);
    return created;
  })();
}
