import { randomUUID } from 'node:crypto';
import { db } from './open.js';
import { newPublicId } from './scoped-public-id.js';
import type { CardVisibility } from '../cards/visibility.js';
import { canEditCard, canReadCard, READABLE_CARD_SQL } from './card-access.js';
import { deleteSessionData } from './sessions.js';

// UUIDs remain internal relational keys. `public_id` is the compact stable key
// used in URLs, scoped by project. `user_id` is retained for migration
// compatibility and mirrors `created_by_user_id` for newly written rows.
export interface Card {
  id: string;
  public_id: string;
  project_id: string;
  created_by_user_id: string;
  user_id: string;
  visibility: CardVisibility;
  session_id: string | null;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  metadata: string | null;
  embedding: string | null;
  created_at: string;
  updated_at: string;
  recall_count: number;
  player: string | null;
  player_resolved: number;
}

export interface NewCard {
  project_id: string;
  created_by_user_id: string;
  visibility: CardVisibility;
  session_id: string | null;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  metadata: string | null;
  embedding: number[] | null;
}

export interface UpdateCardInput {
  project_id: string;
  session_id: string | null;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  metadata: string | null;
  embedding: number[] | null;
}

export interface PublicCardRecord extends Card {
  project_slug: string;
  project_name: string;
}

export function createCard(input: NewCard): Card {
  const now = new Date().toISOString();
  const card: Card = {
    id: randomUUID(),
    public_id: newPublicId('cards', input.project_id),
    project_id: input.project_id,
    created_by_user_id: input.created_by_user_id,
    user_id: input.created_by_user_id,
    visibility: input.visibility,
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
    `INSERT INTO cards
       (id, public_id, project_id, created_by_user_id, user_id, visibility,
        session_id, title, artist, hook, recall_phrase, background, metadata,
        embedding, created_at, updated_at, recall_count, player,
        player_resolved)
     VALUES
       (@id, @public_id, @project_id, @created_by_user_id, @user_id,
        @visibility,
        @session_id, @title, @artist, @hook, @recall_phrase, @background,
        @metadata, @embedding, @created_at, @updated_at, @recall_count, @player,
        @player_resolved)`
  ).run(card);
  return card;
}

export function listCards(projectId: string, actorUserId: string): Card[] {
  return db
    .prepare(
      `SELECT * FROM cards
       WHERE project_id = ?
         AND ${READABLE_CARD_SQL}
       ORDER BY updated_at DESC`
    )
    .all(projectId, actorUserId, actorUserId) as Card[];
}

export function listCardsForDisplay(
  projectId: string,
  actorUserId: string
): Card[] {
  return db
    .prepare(
      `SELECT id, public_id, project_id, created_by_user_id, user_id,
         visibility,
         session_id, title, artist, hook, recall_phrase, background, metadata,
         created_at, updated_at, recall_count, player, player_resolved
       FROM cards
       WHERE project_id = ?
         AND ${READABLE_CARD_SQL}
       ORDER BY updated_at DESC`
    )
    .all(projectId, actorUserId, actorUserId) as Card[];
}

export function getCardById(id: string, actorUserId: string): Card | undefined {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as
    | Card
    | undefined;
  return card && canReadCard(card, actorUserId) ? card : undefined;
}

export function getCardByPublicId(
  projectId: string,
  publicId: string,
  actorUserId: string
): Card | undefined {
  const card = db
    .prepare('SELECT * FROM cards WHERE project_id = ? AND public_id = ?')
    .get(projectId, publicId) as Card | undefined;
  return card && canReadCard(card, actorUserId) ? card : undefined;
}

export function getPublicCard(
  projectSlug: string,
  publicId: string
): PublicCardRecord | undefined {
  return db
    .prepare(
      `SELECT c.*, p.slug AS project_slug, p.name AS project_name
       FROM cards c
       JOIN projects p ON p.id = c.project_id
       WHERE p.slug = ? AND c.public_id = ? AND c.visibility = 'public'`
    )
    .get(projectSlug, publicId) as PublicCardRecord | undefined;
}

export function getEditableCardById(
  id: string,
  actorUserId: string
): Card | undefined {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as
    | Card
    | undefined;
  return card && canEditCard(card, actorUserId) ? card : undefined;
}

export function getEditableCardByPublicId(
  projectId: string,
  publicId: string,
  actorUserId: string
): Card | undefined {
  const card = db
    .prepare('SELECT * FROM cards WHERE project_id = ? AND public_id = ?')
    .get(projectId, publicId) as Card | undefined;
  return card && canEditCard(card, actorUserId) ? card : undefined;
}

export function updateCard(
  id: string,
  actorUserId: string,
  input: UpdateCardInput
): Card | undefined {
  const card = getEditableCardById(id, actorUserId);
  if (!card || card.project_id !== input.project_id) return undefined;
  db.prepare(
    `UPDATE cards SET
       session_id = @session_id, title = @title, artist = @artist,
       hook = @hook, recall_phrase = @recall_phrase, background = @background,
       metadata = @metadata, embedding = @embedding, updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id,
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
  return getCardById(id, actorUserId);
}

export function setCardPlayer(id: string, player: string | null): void {
  db.prepare(
    'UPDATE cards SET player = ?, player_resolved = 1 WHERE id = ?'
  ).run(player, id);
}

export function editCardFields(
  id: string,
  actorUserId: string,
  fields: {
    title: string;
    artist: string;
    hook: string;
    recall_phrase: string;
    background: string;
    metadata: string | null;
    embedding: string | null;
    player: string | null;
    visibility: CardVisibility;
  }
): Card | undefined {
  const card = getEditableCardById(id, actorUserId);
  if (!card) return undefined;
  db.prepare(
    `UPDATE cards SET title = @title, artist = @artist, hook = @hook,
       recall_phrase = @recall_phrase, background = @background,
       metadata = @metadata, embedding = @embedding, player = @player,
       visibility = @visibility, player_resolved = 1, updated_at = @updated_at
     WHERE id = @id`
  ).run({ id, ...fields, updated_at: new Date().toISOString() });
  return getCardById(id, actorUserId);
}

export function deleteCard(id: string, actorUserId: string): boolean {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as
    | Card
    | undefined;
  // Only the creator can delete a card and its private source session.
  if (!card || !canEditCard(card, actorUserId)) return false;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    if (card.session_id) {
      deleteSessionData(card.session_id);
    }
  });
  tx();
  return true;
}

export function bumpRecallCount(id: string, actorUserId: string): void {
  const card = getCardById(id, actorUserId);
  if (!card) return;
  db.prepare(
    'UPDATE cards SET recall_count = recall_count + 1 WHERE id = ?'
  ).run(id);
}
