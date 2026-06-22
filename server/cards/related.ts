import { listCards } from '../db/cards.js';
import { embed } from '../llm/embed.js';
import { cosineSimilarity } from './similarity.js';
import { cardToClient } from './to-client.js';

// How many related cards the ambient rail shows.
const RELATED_SHOW = 3;

// Ambient in-session recall: surface related past cards by embedding similarity
// only -- no LLM rerank and no reason text. Cheap enough to run on every turn,
// unlike the considered, reason-bearing recall used elsewhere.
export async function relatedToText(text: string, excludeCardId?: string) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const cards = listCards().filter(c => c.embedding && c.id !== excludeCardId);
  if (cards.length === 0) return [];
  const vector = await embed(trimmed);
  return cards
    .map(card => ({
      card,
      score: cosineSimilarity(vector, JSON.parse(card.embedding!)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RELATED_SHOW)
    .map(({ card }) => cardToClient(card));
}
