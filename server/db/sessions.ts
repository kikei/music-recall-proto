import { randomUUID } from 'node:crypto';
import { db } from './open.js';

export interface Session {
  id: string;
  title: string;
  artist: string;
  status: string;
  base_card_id: string | null; // on a continued session, the card to overwrite
  player: string | null; // player pasted at start (Player as JSON)
  metadata: string | null; // freeform reference notes, inherited by the card
  created_at: string;
}

export function createSession(
  title: string,
  artist: string,
  metadata: string,
  baseCardId: string | null = null,
  player: string | null = null
): Session {
  const session: Session = {
    id: randomUUID(),
    title,
    artist,
    status: 'active',
    base_card_id: baseCardId || null,
    player: player || null,
    metadata,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO sessions (id, title, artist, status, base_card_id,
       player, metadata, created_at)
     VALUES (@id, @title, @artist, @status, @base_card_id,
       @player, @metadata, @created_at)`
  ).run(session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
    | Session
    | undefined;
}

// Open sessions for the workspace sidebar, newest first.
export function listActiveSessions(): Session[] {
  return db
    .prepare(
      "SELECT * FROM sessions WHERE status = 'active' ORDER BY created_at DESC"
    )
    .all() as Session[];
}

// Update the work a session is about while it is open. Title/artist can be
// wrong when filled from a pasted URL's metadata, and the reference metadata is
// entered here too; the card compressed from the session inherits all of them.
export function editSessionWork(
  id: string,
  fields: { title: string; artist: string; metadata: string | null }
): Session | undefined {
  db.prepare(
    `UPDATE sessions SET title = @title, artist = @artist, metadata = @metadata
     WHERE id = @id`
  ).run({ id, ...fields });
  return getSession(id);
}

export function closeSession(id: string): void {
  db.prepare("UPDATE sessions SET status = 'closed' WHERE id = ?").run(id);
}

// Discard an open session and its messages. Used for sessions not yet turned
// into a card (no card references them).
export function deleteSession(id: string): void {
  db.prepare('DELETE FROM messages WHERE session_id = ?').run(id);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}
