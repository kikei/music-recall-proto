import { randomUUID } from 'node:crypto';
import { db } from './open.js';

export interface Session {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  status: string;
  base_card_id: string | null; // on a continued session, the card to overwrite
  player: string | null; // player pasted at start (Player as JSON)
  created_at: string;
}

export function createSession(
  title: string,
  artist: string,
  album: string | null,
  baseCardId: string | null = null,
  player: string | null = null
): Session {
  const session: Session = {
    id: randomUUID(),
    title,
    artist,
    album: album || null,
    status: 'active',
    base_card_id: baseCardId || null,
    player: player || null,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO sessions (id, title, artist, album, status, base_card_id,
       player, created_at)
     VALUES (@id, @title, @artist, @album, @status, @base_card_id,
       @player, @created_at)`
  ).run(session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
    | Session
    | undefined;
}

// Open sessions for the workspace sidebar, oldest first.
export function listActiveSessions(): Session[] {
  return db
    .prepare(
      "SELECT * FROM sessions WHERE status = 'active' ORDER BY created_at ASC"
    )
    .all() as Session[];
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
