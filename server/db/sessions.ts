import { randomUUID } from 'node:crypto';
import { db } from './open.js';

// A listening session. Like cards, every access is scoped by its owner.
export interface Session {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  status: string;
  base_card_id: string | null; // on a continued session, the card to overwrite
  player: string | null; // player pasted at start (Player as JSON)
  metadata: string | null; // freeform reference notes, inherited by the card
  created_at: string;
}

export function createSession(
  userId: string,
  title: string,
  artist: string,
  metadata: string,
  baseCardId: string | null = null,
  player: string | null = null
): Session {
  const session: Session = {
    id: randomUUID(),
    user_id: userId,
    title,
    artist,
    status: 'active',
    base_card_id: baseCardId || null,
    player: player || null,
    metadata,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO sessions (id, user_id, title, artist, status, base_card_id,
       player, metadata, created_at)
     VALUES (@id, @user_id, @title, @artist, @status, @base_card_id,
       @player, @metadata, @created_at)`
  ).run(session);
  return session;
}

export function getSession(id: string, userId: string): Session | undefined {
  return db
    .prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?')
    .get(id, userId) as Session | undefined;
}

// Open sessions for the workspace sidebar, newest first.
export function listActiveSessions(userId: string): Session[] {
  return db
    .prepare(
      `SELECT * FROM sessions WHERE status = 'active' AND user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId) as Session[];
}

// Update the work a session is about while it is open. Title/artist can be
// wrong when filled from a pasted URL's metadata, and the reference metadata is
// entered here too; the card compressed from the session inherits all of them.
export function editSessionWork(
  id: string,
  userId: string,
  fields: { title: string; artist: string; metadata: string | null }
): Session | undefined {
  db.prepare(
    `UPDATE sessions SET title = @title, artist = @artist, metadata = @metadata
     WHERE id = @id AND user_id = @user_id`
  ).run({ id, user_id: userId, ...fields });
  return getSession(id, userId);
}

export function closeSession(id: string, userId: string): void {
  db.prepare(
    "UPDATE sessions SET status = 'closed' WHERE id = ? AND user_id = ?"
  ).run(id, userId);
}

// Discard an open session and its messages. Used for sessions not yet turned
// into a card (no card references them).
export function deleteSession(id: string, userId: string): void {
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM messages WHERE session_id IN
         (SELECT id FROM sessions WHERE id = ? AND user_id = ?)`
    ).run(id, userId);
    db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(
      id,
      userId
    );
  });
  tx();
}
