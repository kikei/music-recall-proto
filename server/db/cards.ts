import { randomUUID } from 'node:crypto';
import { db } from './open.js';

// Reunion card: the smallest unit that records an encounter with music.
// Every read and write is scoped by user_id: the owner is a required argument
// rather than a filter the caller may forget, so one account can never reach
// another's cards (recall in particular must never surface someone else's).
export interface Card {
  id: string;
  user_id: string;
  session_id: string | null;
  title: string;
  artist: string;
  hook: string; // the snag (what caught you)
  recall_phrase: string; // recall phrase
  background: string; // background
  metadata: string | null; // freeform reference notes (album/label/etc.)
  embedding: string | null; // embedding vector as JSON
  created_at: string;
  updated_at: string;
  recall_count: number; // times referenced from recall
  player: string | null; // listening player info (JSON)
  player_resolved: number; // whether resolution was attempted (0/1)
}

export interface NewCard {
  user_id: string;
  session_id: string | null;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  metadata: string | null;
  embedding: number[] | null;
}

export function createCard(input: NewCard): Card {
  const now = new Date().toISOString();
  const card: Card = {
    id: randomUUID(),
    user_id: input.user_id,
    session_id: input.session_id,
    title: input.title,
    artist: input.artist,
    hook: input.hook,
    recall_phrase: input.recall_phrase,
    background: input.background,
    metadata: input.metadata,
    embedding: input.embedding ? JSON.stringify(input.embedding) : null,
    created_at: now,
    updated_at: now,
    recall_count: 0,
    player: null,
    player_resolved: 0,
  };
  db.prepare(
    `INSERT INTO cards (id, user_id, session_id, title, artist, hook,
       recall_phrase, background, metadata, embedding, created_at, updated_at,
       recall_count, player, player_resolved)
     VALUES (@id, @user_id, @session_id, @title, @artist, @hook,
       @recall_phrase, @background, @metadata, @embedding, @created_at,
       @updated_at, @recall_count, @player, @player_resolved)`
  ).run(card);
  return card;
}

export function listCards(userId: string): Card[] {
  return db
    .prepare('SELECT * FROM cards WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId) as Card[];
}

export function getCard(id: string, userId: string): Card | undefined {
  return db
    .prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?')
    .get(id, userId) as Card | undefined;
}

// Overwrite the original card with new data on a continued session. Keep id,
// created_at, recall_count; update content, metadata, embedding, source
// session, updated_at. The continued session's metadata was seeded from this
// card, so writing it back preserves the notes and applies any edits.
export function updateCard(
  id: string,
  userId: string,
  input: NewCard
): Card | undefined {
  db.prepare(
    `UPDATE cards SET
       session_id = @session_id, title = @title, artist = @artist,
       hook = @hook, recall_phrase = @recall_phrase, background = @background,
       metadata = @metadata, embedding = @embedding, updated_at = @updated_at
     WHERE id = @id AND user_id = @user_id`
  ).run({
    id,
    user_id: userId,
    session_id: input.session_id,
    title: input.title,
    artist: input.artist,
    hook: input.hook,
    recall_phrase: input.recall_phrase,
    background: input.background,
    metadata: input.metadata,
    embedding: input.embedding ? JSON.stringify(input.embedding) : null,
    updated_at: new Date().toISOString(),
  });
  return getCard(id, userId);
}

// Record the player resolution result on the card (resolved=1 even if none).
export function setCardPlayer(
  id: string,
  userId: string,
  player: string | null
): void {
  db.prepare(
    'UPDATE cards SET player = ?, player_resolved = 1 WHERE id = ? AND user_id = ?'
  ).run(player, id, userId);
}

// Edit from the detail view: update title, artist, hook, recall phrase,
// background, metadata, embedding, and player.
export function editCardFields(
  id: string,
  userId: string,
  fields: {
    title: string;
    artist: string;
    hook: string;
    recall_phrase: string;
    background: string;
    metadata: string | null;
    embedding: string | null;
    player: string | null;
  }
): Card | undefined {
  db.prepare(
    `UPDATE cards SET title = @title, artist = @artist, hook = @hook,
       recall_phrase = @recall_phrase, background = @background,
       metadata = @metadata, embedding = @embedding, player = @player,
       player_resolved = 1, updated_at = @updated_at
     WHERE id = @id AND user_id = @user_id`
  ).run({
    id,
    user_id: userId,
    ...fields,
    updated_at: new Date().toISOString(),
  });
  return getCard(id, userId);
}

// Delete a card, along with its source session and that session's messages.
export function deleteCard(id: string, userId: string): boolean {
  const card = getCard(id, userId);
  if (!card) return false;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM cards WHERE id = ? AND user_id = ?').run(
      id,
      userId
    );
    if (card.session_id) {
      db.prepare('DELETE FROM messages WHERE session_id = ?').run(
        card.session_id
      );
      db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(
        card.session_id,
        userId
      );
    }
  });
  tx();
  return true;
}

// Increment the reference count each time the card surfaces in recall.
export function bumpRecallCount(id: string, userId: string): void {
  db.prepare(
    'UPDATE cards SET recall_count = recall_count + 1 WHERE id = ? AND user_id = ?'
  ).run(id, userId);
}
