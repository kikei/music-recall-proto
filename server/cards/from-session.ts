import { getSessionById, closeSession, type Session } from '../db/sessions.js';
import { listMessages } from '../db/messages.js';
import {
  createCard,
  updateCard,
  getCardById,
  setCardPlayer,
  type Card,
} from '../db/cards.js';
import { getProjectById } from '../db/projects.js';
import { selectOwnBaseCard } from '../db/card-access.js';
import { compressSession } from '../llm/compress.js';
import { embed, cardEmbeddingText } from '../llm/embed.js';
import { resolvePlayer, playerConfigured } from '../player/resolve.js';

// End a listening session and compress the dialogue into one reunion card.
// A continued session (with base_card_id) overwrites the original card;
// otherwise a new card is created.
export async function createCardFromSession(
  sessionId: string,
  userId: string
): Promise<Card> {
  const session = getSessionById(sessionId, userId);
  if (!session) throw new Error('session not found');

  const history = listMessages(sessionId);
  const compressed = await compressSession(
    { title: session.title, artist: session.artist },
    history
  );

  const embedding = await embed(cardEmbeddingText(compressed));
  const base = session.base_card_id
    ? getCardById(session.base_card_id, userId)
    : undefined;
  // Continuing one's own card updates it in place. A member may also start
  // from somebody else's shared card, but finishing that session must create a
  // new card owned by the member instead of replacing the original card or
  // attaching the member's private transcript to it.
  const ownBase = selectOwnBaseCard(base, userId);
  const project = getProjectById(session.project_id);
  if (!project) throw new Error('project not found');
  const input = {
    project_id: session.project_id,
    created_by_user_id: userId,
    visibility: ownBase?.visibility ?? project.default_card_visibility,
    session_id: sessionId,
    title: compressed.title,
    artist: compressed.artist,
    hook: compressed.hook,
    recall_phrase: compressed.recall_phrase,
    background: compressed.background,
    // The reference metadata is entered on the session (seeded from the base
    // card on a continued session), so the card just inherits it.
    metadata: session.metadata,
    embedding,
  };

  // Resolve the optional player before mutating the card. If a configured
  // provider is unavailable, the session remains open and no half-finished
  // card is left behind.
  const playerUpdate = await resolveCardPlayer(
    session,
    ownBase,
    compressed.title,
    compressed.artist
  );

  // A continued session overwrites the original only when it belongs to this
  // user. Continuing a shared card produces a separate card above.
  const card = ownBase
    ? updateCard(ownBase.id, userId, input)
    : createCard(input);
  if (!card) throw new Error('継続元のカードを更新できませんでした。');

  if (playerUpdate !== undefined) setCardPlayer(card.id, playerUpdate);

  closeSession(sessionId, userId);
  const saved = getCardById(card.id, userId);
  if (!saved) throw new Error('保存したカードを読み取れませんでした。');
  return saved;
}

// Decide the listening player to save on the card. Priority order:
// (1) If a URL was pasted at start, use it (no API key, explicit user choice).
// (2) On a continued session, keep the original card's existing player.
//     The work has not changed, so avoid re-searching and destabilizing it.
// (3) Otherwise resolve via the dedicated API search. Searching stays
//     unsettled while no credentials exist (can be re-resolved after keys).
async function resolveCardPlayer(
  session: Session,
  ownBase: Card | undefined,
  title: string,
  artist: string
): Promise<string | null | undefined> {
  if (session.player) return session.player;
  if (ownBase?.player) return undefined;
  const player = await resolvePlayer(title, artist);
  if (player || playerConfigured()) {
    return player ? JSON.stringify(player) : null;
  }
  return undefined;
}
