import { getCard, editCardFields, type Card } from '../db/cards.js';
import { embed, cardEmbeddingText } from '../llm/embed.js';
import { parsePlayerUrl } from '../player/parse-url.js';

export interface CardPatch {
  hook?: string;
  recall_phrase?: string;
  background?: string;
  playerUrl?: string; // empty string removes the player
}

// Edit a card from the detail view: hook, recall phrase, background, player
// URL. Recompute the embedding vector when the text changes.
export async function editCard(
  id: string,
  patch: CardPatch
): Promise<Card | undefined> {
  const card = getCard(id);
  if (!card) return undefined;

  const hook = patch.hook ?? card.hook;
  const recall_phrase = patch.recall_phrase ?? card.recall_phrase;
  const background = patch.background ?? card.background;
  const textChanged =
    patch.hook !== undefined ||
    patch.recall_phrase !== undefined ||
    patch.background !== undefined;

  let embedding = card.embedding;
  if (textChanged) {
    const vector = await embed(
      cardEmbeddingText({
        title: card.title,
        artist: card.artist,
        hook,
        recall_phrase,
        background,
      })
    );
    embedding = JSON.stringify(vector);
  }

  let player = card.player;
  if (patch.playerUrl !== undefined) {
    const trimmed = patch.playerUrl.trim();
    if (!trimmed) {
      player = null;
    } else {
      const parsed = parsePlayerUrl(trimmed);
      if (!parsed) {
        throw new Error(
          '対応していない URL です (Spotify / YouTube / ニコニコ動画)'
        );
      }
      player = JSON.stringify(parsed);
    }
  }

  return editCardFields(id, {
    hook,
    recall_phrase,
    background,
    embedding,
    player,
  });
}
