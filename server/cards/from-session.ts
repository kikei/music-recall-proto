import { getSession, closeSession, type Session } from '../db/sessions.js';
import { listMessages } from '../db/messages.js';
import {
  createCard,
  updateCard,
  getCard,
  setCardPlayer,
  type Card,
} from '../db/cards.js';
import { compressSession } from '../llm/compress.js';
import { embed, cardEmbeddingText } from '../llm/embed.js';
import { resolvePlayer, playerConfigured } from '../player/resolve.js';

// End a listening session and compress the dialogue into one reunion card.
// A continued session (with base_card_id) overwrites the original card;
// otherwise a new card is created.
export async function createCardFromSession(sessionId: string): Promise<Card> {
  const session = getSession(sessionId);
  if (!session) throw new Error('session not found');

  const history = listMessages(sessionId);
  const compressed = await compressSession(
    { title: session.title, artist: session.artist, album: session.album },
    history
  );

  const embedding = await embed(cardEmbeddingText(compressed));
  const input = {
    session_id: sessionId,
    title: compressed.title,
    artist: compressed.artist,
    album: compressed.album,
    hook: compressed.hook,
    recall_phrase: compressed.recall_phrase,
    background: compressed.background,
    embedding,
  };

  // Continued session: overwrite the original card if it still exists.
  const overwrite =
    session.base_card_id && getCard(session.base_card_id)
      ? updateCard(session.base_card_id, input)
      : undefined;
  const card = overwrite ?? createCard(input);

  await persistCardPlayer(session, card);

  closeSession(sessionId);
  return getCard(card.id) ?? card;
}

// Save the listening player on the card. Priority order:
// (1) If a URL was pasted at start, use it (no API key, explicit user choice).
// (2) On a continued session, keep the original card's existing player.
//     The work has not changed, so avoid re-searching and destabilizing it.
// (3) Otherwise resolve via the dedicated API search. Searching stays
//     unsettled while no credentials exist (can be re-resolved after keys).
async function persistCardPlayer(session: Session, card: Card): Promise<void> {
  if (session.player) {
    setCardPlayer(card.id, session.player);
    return;
  }
  if (card.player) return;
  const player = await resolvePlayer(card.title, card.artist);
  if (player || playerConfigured()) {
    setCardPlayer(card.id, player ? JSON.stringify(player) : null);
  }
}
