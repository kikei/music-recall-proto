import type { Card, PublicCardRecord } from '../db/cards.js';
import { isCardCreator } from '../db/card-access.js';
import { parsePlayerJson } from '../player/parse-json.js';

// Shape a DB card for the client. Drop internal fields (embedding, resolved
// flag) and expand player from JSON into an object.
export function cardToClient(
  card: Card,
  projectSlug: string,
  actorUserId: string
) {
  const isCreator = isCardCreator(card, actorUserId);
  return {
    id: card.public_id,
    projectSlug,
    canEdit: isCreator,
    hasTranscript: isCreator && card.session_id !== null,
    canDelete: isCreator,
    canChangeVisibility: isCreator,
    title: card.title,
    artist: card.artist,
    hook: card.hook,
    recall_phrase: card.recall_phrase,
    background: card.background,
    metadata: isCreator ? card.metadata : null,
    created_at: card.created_at,
    updated_at: card.updated_at,
    recall_count: card.recall_count,
    visibility: card.visibility,
    player: parsePlayerJson(card.player),
  };
}

// Public cards deliberately omit ownership, reference metadata and the source
// session. Publishing the compressed card never publishes its conversation.
export function cardToPublic(card: PublicCardRecord) {
  return {
    id: card.public_id,
    projectSlug: card.project_slug,
    projectName: card.project_name,
    title: card.title,
    artist: card.artist,
    hook: card.hook,
    recall_phrase: card.recall_phrase,
    background: card.background,
    created_at: card.created_at,
    player: parsePlayerJson(card.player),
  };
}
