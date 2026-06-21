import { randomUUID } from 'node:crypto';
import { db } from './open.js';

// Reunion card: the smallest unit that records an encounter with music.
export interface Card {
  id: string;
  session_id: string | null;
  title: string;
  artist: string;
  album: string | null;
  hook: string; // the snag (what caught you)
  recall_phrase: string; // recall phrase
  background: string; // background
  embedding: string | null; // embedding vector as JSON
  created_at: string;
  updated_at: string;
  recall_count: number; // times referenced from recall
  player: string | null; // listening player info (JSON)
  player_resolved: number; // whether resolution was attempted (0/1)
}

export interface NewCard {
  session_id: string | null;
  title: string;
  artist: string;
  album: string | null;
  hook: string;
  recall_phrase: string;
  background: string;
  embedding: number[] | null;
}

export function createCard(input: NewCard): Card {
  const now = new Date().toISOString();
  const card: Card = {
    id: randomUUID(),
    session_id: input.session_id,
    title: input.title,
    artist: input.artist,
    album: input.album || null,
    hook: input.hook,
    recall_phrase: input.recall_phrase,
    background: input.background,
    embedding: input.embedding ? JSON.stringify(input.embedding) : null,
    created_at: now,
    updated_at: now,
    recall_count: 0,
    player: null,
    player_resolved: 0,
  };
  db.prepare(
    `INSERT INTO cards (id, session_id, title, artist, album, hook,
       recall_phrase, background, embedding, created_at, updated_at,
       recall_count, player, player_resolved)
     VALUES (@id, @session_id, @title, @artist, @album, @hook,
       @recall_phrase, @background, @embedding, @created_at, @updated_at,
       @recall_count, @player, @player_resolved)`
  ).run(card);
  return card;
}

export function listCards(): Card[] {
  return db
    .prepare('SELECT * FROM cards ORDER BY updated_at DESC')
    .all() as Card[];
}

export function getCard(id: string): Card | undefined {
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as
    | Card
    | undefined;
}

// Overwrite the original card with new data on a continued session. Keep id,
// created_at, recall_count; update content, embedding, source session,
// updated_at.
export function updateCard(id: string, input: NewCard): Card | undefined {
  db.prepare(
    `UPDATE cards SET
       session_id = @session_id, title = @title, artist = @artist,
       album = @album, hook = @hook, recall_phrase = @recall_phrase,
       background = @background, embedding = @embedding, updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id,
    session_id: input.session_id,
    title: input.title,
    artist: input.artist,
    album: input.album || null,
    hook: input.hook,
    recall_phrase: input.recall_phrase,
    background: input.background,
    embedding: input.embedding ? JSON.stringify(input.embedding) : null,
    updated_at: new Date().toISOString(),
  });
  return getCard(id);
}

// Record the player resolution result on the card (resolved=1 even if none).
export function setCardPlayer(id: string, player: string | null): void {
  db.prepare(
    'UPDATE cards SET player = ?, player_resolved = 1 WHERE id = ?'
  ).run(player, id);
}

// Edit from the detail view: update hook, recall phrase, background,
// embedding, and player (title etc. are not changed).
export function editCardFields(
  id: string,
  fields: {
    hook: string;
    recall_phrase: string;
    background: string;
    embedding: string | null;
    player: string | null;
  }
): Card | undefined {
  db.prepare(
    `UPDATE cards SET hook = @hook, recall_phrase = @recall_phrase,
       background = @background, embedding = @embedding, player = @player,
       player_resolved = 1, updated_at = @updated_at
     WHERE id = @id`
  ).run({ id, ...fields, updated_at: new Date().toISOString() });
  return getCard(id);
}

// Delete a card, along with its source session and that session's messages.
export function deleteCard(id: string): boolean {
  const card = getCard(id);
  if (!card) return false;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    if (card.session_id) {
      db.prepare('DELETE FROM messages WHERE session_id = ?').run(
        card.session_id
      );
      db.prepare('DELETE FROM sessions WHERE id = ?').run(card.session_id);
    }
  });
  tx();
  return true;
}

// Increment the reference count each time the card surfaces in recall.
export function bumpRecallCount(id: string): void {
  db.prepare(
    'UPDATE cards SET recall_count = recall_count + 1 WHERE id = ?'
  ).run(id);
}
