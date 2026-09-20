import { listCards, type Card } from '../db/cards.js';
import { embed } from '../llm/embed.js';
import { cosineSimilarity } from './similarity.js';
import { requireCardEmbeddings } from './card-embeddings.js';
import type { ProjectCardScope } from './project-card-scope.js';

// How many related cards the ambient rail shows.
const RELATED_SHOW = 3;

// Ambient in-session recall: surface related past cards by embedding similarity
// only -- no LLM rerank and no reason text. Cheap enough to run on every turn,
// unlike the considered, reason-bearing recall used elsewhere.
export async function relatedToText(
  text: string,
  scope: ProjectCardScope,
  excludeCardId?: string
): Promise<Card[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const cards = listCards(scope.projectId, scope.userId).filter(
    c => c.id !== excludeCardId
  );
  if (cards.length === 0) return [];
  requireCardEmbeddings(
    cards,
    '関連カード用の埋め込みがないカードがあります。'
  );
  const vector = await embed(trimmed);
  return cards
    .map(card => ({
      card,
      score: cosineSimilarity(vector, JSON.parse(card.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RELATED_SHOW)
    .map(({ card }) => card);
}
