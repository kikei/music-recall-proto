import { embedVector } from './run.js';
import { embedModel } from './client.js';

export async function embed(text: string): Promise<number[]> {
  return embedVector('embed', { model: embedModel, input: text });
}

// Text used for a card's semantic search. Bundling the title with the hook and
// recall phrase lets recall work from a vague impression. The background is
// intentionally left out: including it pulls recall toward genre/topic matches
// instead of the impression of the song.
export function cardEmbeddingText(card: {
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
}): string {
  return [
    `${card.title} / ${card.artist}`,
    card.hook,
    card.recall_phrase,
  ]
    .filter(Boolean)
    .join('\n');
}
