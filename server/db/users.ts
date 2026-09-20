import { randomUUID } from 'node:crypto';
import { db } from './open.js';
import { generateDisplayName } from '../accounts/display-name.js';
import { deleteProjectData } from './project-deletion.js';

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

export function getUserBySubject(subject: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE subject = ?').get(subject) as
    | User
    | undefined;
}

export function findOrCreateUser(subject: string): User {
  const found = getUserBySubject(subject);
  if (found) return found;

  const user: User = {
    id: randomUUID(),
    subject,
    display_name: generateDisplayName(),
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO users (id, subject, display_name, created_at)
     VALUES (@id, @subject, @display_name, @created_at)`
  ).run(user);
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

export function deleteUserAccount(id: string): boolean {
  if (!getUser(id)) return false;

  const remove = db.transaction(() => {
    const solelyOwnedProjects = db
      .prepare(
        `SELECT pm.project_id
         FROM project_members pm
         WHERE pm.user_id = ? AND pm.role = 'owner'
           AND NOT EXISTS (
             SELECT 1 FROM project_members other
             WHERE other.project_id = pm.project_id
               AND other.user_id <> pm.user_id
               AND other.role = 'owner'
           )`
      )
      .all(id) as { project_id: string }[];

    for (const { project_id: projectId } of solelyOwnedProjects) {
      deleteProjectData(projectId);
    }

    // Projects with another owner remain. Remove only this account's work and
    // membership from them, including source conversations behind its cards.
    db.prepare(
      `DELETE FROM messages WHERE session_id IN
         (SELECT id FROM sessions WHERE created_by_user_id = ?)`
    ).run(id);
    db.prepare(
      `DELETE FROM cards
       WHERE created_by_user_id = ? OR session_id IN
         (SELECT id FROM sessions WHERE created_by_user_id = ?)`
    ).run(id, id);
    db.prepare('DELETE FROM sessions WHERE created_by_user_id = ?').run(id);
    db.prepare('DELETE FROM project_members WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM user_credentials WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM llm_usage WHERE user_id = ?').run(id);
    return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes === 1;
  });

  return remove();
}
