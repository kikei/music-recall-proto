import { randomUUID } from 'node:crypto';
import { db } from './open.js';
import { newPublicId } from './scoped-public-id.js';

// Sessions always belong to their creator, even inside a shared project. Only
// the finished card can be made visible to members or the public.
export interface Session {
  id: string;
  public_id: string;
  project_id: string;
  created_by_user_id: string;
  user_id: string;
  title: string;
  artist: string;
  status: string;
  base_card_id: string | null;
  player: string | null;
  metadata: string | null;
  created_at: string;
}

export function createSession(
  userId: string,
  projectId: string,
  title: string,
  artist: string,
  metadata: string,
  baseCardId: string | null,
  player: string | null
): Session {
  const session: Session = {
    id: randomUUID(),
    public_id: newPublicId('sessions', projectId),
    project_id: projectId,
    created_by_user_id: userId,
    user_id: userId,
    title,
    artist,
    status: 'active',
    base_card_id: baseCardId,
    player,
    metadata,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO sessions
       (id, public_id, project_id, created_by_user_id, user_id, title, artist,
        status, base_card_id, player, metadata, created_at)
     VALUES
       (@id, @public_id, @project_id, @created_by_user_id, @user_id, @title,
        @artist, @status, @base_card_id, @player, @metadata, @created_at)`
  ).run(session);
  return session;
}

export function getSessionById(
  id: string,
  userId: string
): Session | undefined {
  return db
    .prepare('SELECT * FROM sessions WHERE id = ? AND created_by_user_id = ?')
    .get(id, userId) as Session | undefined;
}

export function getSessionByPublicId(
  projectId: string,
  publicId: string,
  userId: string
): Session | undefined {
  return db
    .prepare(
      `SELECT * FROM sessions
       WHERE project_id = ? AND public_id = ? AND created_by_user_id = ?`
    )
    .get(projectId, publicId, userId) as Session | undefined;
}

export function listActiveSessions(
  projectId: string,
  userId: string
): Session[] {
  return db
    .prepare(
      `SELECT * FROM sessions
       WHERE project_id = ? AND status = 'active' AND created_by_user_id = ?
       ORDER BY created_at DESC`
    )
    .all(projectId, userId) as Session[];
}

export function editSessionWork(
  id: string,
  userId: string,
  fields: { title: string; artist: string; metadata: string | null }
): Session | undefined {
  db.prepare(
    `UPDATE sessions SET title = @title, artist = @artist, metadata = @metadata
     WHERE id = @id AND created_by_user_id = @user_id`
  ).run({ id, user_id: userId, ...fields });
  return getSessionById(id, userId);
}

export function closeSession(id: string, userId: string): void {
  db.prepare(
    `UPDATE sessions SET status = 'closed'
     WHERE id = ? AND created_by_user_id = ?`
  ).run(id, userId);
}

export function deleteSession(id: string, userId: string): void {
  const tx = db.transaction(() => {
    if (getSessionById(id, userId)) deleteSessionData(id);
  });
  tx();
}

// Callers must authorize access and invoke this function inside a transaction.
export function deleteSessionData(id: string): void {
  db.prepare('DELETE FROM messages WHERE session_id = ?').run(id);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}
