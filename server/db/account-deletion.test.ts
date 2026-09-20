import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCard, type NewCard } from './cards.js';
import { db } from './open.js';
import { createProject, getProjectBySlug } from './projects.js';
import { addMessage } from './messages.js';
import { createSession } from './sessions.js';
import { deleteUserAccount, findOrCreateUser, getUser } from './users.js';

function cardInput(
  projectId: string,
  userId: string,
  sessionId: string
): NewCard {
  return {
    project_id: projectId,
    created_by_user_id: userId,
    visibility: 'public',
    session_id: sessionId,
    title: 'Test record',
    artist: 'Test artist',
    hook: 'A private impression',
    recall_phrase: 'A test cue',
    background: 'Test background',
    metadata: null,
    embedding: null,
  };
}

describe('account deletion', () => {
  it('removes owned projects and only the account data from shared projects', () => {
    const deleting = findOrCreateUser(`delete-${randomUUID()}`);
    const other = findOrCreateUser(`keep-${randomUUID()}`);
    const owned = createProject(
      deleting.id,
      'Owned project',
      `owned-${randomUUID().slice(0, 12)}`,
      'public'
    );
    const shared = createProject(
      other.id,
      'Shared project',
      `shared-${randomUUID().slice(0, 12)}`,
      'public'
    );
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (?, ?, 'member', ?)`
    ).run(shared.id, deleting.id, new Date().toISOString());

    const ownedSession = createSession(
      deleting.id,
      owned.id,
      'Owned record',
      'Test artist',
      '',
      null,
      null
    );
    addMessage(ownedSession.id, 'user', 'Owned message');
    createCard(cardInput(owned.id, deleting.id, ownedSession.id));

    const deletedSharedSession = createSession(
      deleting.id,
      shared.id,
      'Deleted shared record',
      'Test artist',
      '',
      null,
      null
    );
    addMessage(deletedSharedSession.id, 'user', 'Deleted shared message');
    const deletedSharedCard = createCard(
      cardInput(shared.id, deleting.id, deletedSharedSession.id)
    );
    const keptSession = createSession(
      other.id,
      shared.id,
      'Kept record',
      'Test artist',
      '',
      null,
      null
    );
    const keptCard = createCard(cardInput(shared.id, other.id, keptSession.id));
    db.prepare(
      `INSERT INTO user_credentials
         (user_id, kind, secret, hint, updated_at)
       VALUES (?, 'openai', 'encrypted', 'hint', ?)`
    ).run(deleting.id, new Date().toISOString());
    db.prepare(
      `INSERT INTO llm_usage
         (id, created_at, user_id, use, provider, model)
       VALUES (?, ?, ?, 'test', 'test', 'test')`
    ).run(randomUUID(), new Date().toISOString(), deleting.id);

    expect(deleteUserAccount(deleting.id)).toBe(true);
    expect(getUser(deleting.id)).toBeUndefined();
    expect(getProjectBySlug(owned.slug)).toBeUndefined();
    expect(getProjectBySlug(shared.slug)?.id).toBe(shared.id);
    expect(
      db.prepare('SELECT 1 FROM cards WHERE id = ?').get(deletedSharedCard.id)
    ).toBeUndefined();
    expect(
      db.prepare('SELECT 1 FROM cards WHERE id = ?').get(keptCard.id)
    ).toBeDefined();
    expect(
      db
        .prepare('SELECT 1 FROM project_members WHERE user_id = ?')
        .get(deleting.id)
    ).toBeUndefined();
    expect(
      db
        .prepare('SELECT 1 FROM user_credentials WHERE user_id = ?')
        .get(deleting.id)
    ).toBeUndefined();
    expect(
      db.prepare('SELECT 1 FROM llm_usage WHERE user_id = ?').get(deleting.id)
    ).toBeUndefined();
  });
});
