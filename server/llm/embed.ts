import { embedVector } from './run.js';
import { embedModel } from './client.js';

export async function embed(text: string): Promise<number[]> {
  return embedVector('embed', { model: embedModel, input: text });
}

// Text used for a card's semantic search. Bundling not just the title but the
// hook, recall phrase, and background lets recall work from a vague impression.
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
    card.background,
  ]
    .filter(Boolean)
    .join('\n');
}
