import { openai, embedModel } from './client.js';

export async function embed(text: string): Promise<number[]> {
  const response = await openai().embeddings.create({
    model: embedModel,
    input: text,
  });
  return response.data[0].embedding;
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
