import { getCard, editCardFields, type Card } from '../db/cards.js';
import { embed, cardEmbeddingText } from '../llm/embed.js';
import { parsePlayerUrl } from '../player/parse-url.js';

export interface CardPatch {
  title?: string;
  artist?: string;
  hook?: string;
  recall_phrase?: string;
  background?: string;
  metadata?: string; // freeform reference notes; not part of the embedding
  playerUrl?: string; // empty string removes the player
}

// Pick a patched identity field, keeping the current value when it is absent.
// Title and artist are required, so reject an explicit empty value.
function patched(next: string | undefined, current: string, label: string) {
  if (next === undefined) return current;
  const trimmed = next.trim();
  if (!trimmed) throw new Error(`${label}を空にはできません。`);
  return trimmed;
}

// Edit a card from the detail view: title, artist, hook, recall phrase,
// background, player URL. Recompute the embedding vector when any text that
// feeds it changes.
export async function editCard(
  id: string,
  userId: string,
  patch: CardPatch
): Promise<Card | undefined> {
  const card = getCard(id, userId);
  if (!card) return undefined;

  const title = patched(patch.title, card.title, 'タイトル');
  const artist = patched(patch.artist, card.artist, 'アーティスト');
  const hook = patch.hook ?? card.hook;
  const recall_phrase = patch.recall_phrase ?? card.recall_phrase;
  const background = patch.background ?? card.background;
  // Metadata is reference-only; it never feeds the embedding.
  const metadata = patch.metadata ?? card.metadata;
  const textChanged =
    patch.title !== undefined ||
    patch.artist !== undefined ||
    patch.hook !== undefined ||
    patch.recall_phrase !== undefined ||
    patch.background !== undefined;

  let embedding = card.embedding;
  if (textChanged) {
    const vector = await embed(
      cardEmbeddingText({ title, artist, hook, recall_phrase, background })
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

  return editCardFields(id, userId, {
    title,
    artist,
    hook,
    recall_phrase,
    background,
    metadata,
    embedding,
    player,
  });
}
