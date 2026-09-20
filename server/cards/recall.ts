import { listCards, getCardById, type Card } from '../db/cards.js';
import { embed, cardEmbeddingText } from '../llm/embed.js';
import { cosineSimilarity } from './similarity.js';
import { rankRecall } from '../llm/rank.js';
import { expandCue } from '../llm/expand.js';
import { parsePlayerJson } from '../player/parse-json.js';
import type { Player } from '../player/provider.js';
import { requireCardEmbeddings, type EmbeddedCard } from './card-embeddings.js';
import type { ProjectCardScope } from './project-card-scope.js';

export interface RecallResult {
  id: string;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  relevance: number;
  reason: string;
  recall_count: number;
  player: Player | null;
}

// How many candidates the embedding gathers roughly. No relevance judgment
// here; it is a wide net to avoid missing relevant cards. Kept well above SHOW
// so the rerank has room to choose from.
const POOL_SIZE = 10;
// How many to finally surface.
const SHOW = 7;

// Match the cue vector against past cards and surface only a few.
// Embedding similarity is used only to gather candidates; the actual relevance
// judgment and ordering are done by the LLM (similarity can be flat across
// candidates for some queries and fails to work as a ranking).
async function recallByVector(
  queryText: string,
  queryVector: number[],
  cards: EmbeddedCard[],
  direction?: string
): Promise<RecallResult[]> {
  const pool = cards
    .map(card => ({
      card,
      score: cosineSimilarity(queryVector, JSON.parse(card.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, POOL_SIZE)
    .map(({ card }) => card);

  const ranked = await rankRecall(
    queryText,
    pool.map(card => ({
      id: card.id,
      title: card.title,
      artist: card.artist,
      hook: card.hook,
      recall_phrase: card.recall_phrase,
      background: card.background,
    })),
    direction,
    SHOW
  );

  const byId = new Map(pool.map(card => [card.id, card]));
  const seen = new Set<string>();
  for (const result of ranked) {
    if (!byId.has(result.id) || seen.has(result.id)) {
      throw new Error('想起結果に候補外または重複したカードがあります。');
    }
    seen.add(result.id);
  }
  return ranked
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, SHOW)
    .map(r => toResult(byId.get(r.id)!, r.relevance, r.reason));
}

function toResult(card: Card, relevance: number, reason: string): RecallResult {
  return {
    id: card.public_id,
    title: card.title,
    artist: card.artist,
    hook: card.hook,
    recall_phrase: card.recall_phrase,
    background: card.background,
    relevance,
    reason,
    recall_count: card.recall_count,
    player: parsePlayerJson(card.player),
  };
}

// Recall from the current cue (free text). The cue is first expanded into mood
// words (e.g. "午前3時に聴く曲" -> the feel of deep night) so the time/scene it
// implies actually steers retrieval and the rerank, instead of the bare digit
// being lost in the embedding.
export async function recall(
  query: string,
  scope: ProjectCardScope
): Promise<RecallResult[]> {
  const cards = listCards(scope.projectId, scope.userId);
  if (cards.length === 0) return [];
  requireCardEmbeddings(cards, '想起用の埋め込みがないカードがあります。');
  const impression = await expandCue(query);
  const cueText = impression ? `${query}\n${impression}` : query;
  const queryVector = await embed(cueText);
  return recallByVector(cueText, queryVector, cards);
}

// Recall starting from a single card. `direction` steers the recall toward a
// kind of music (e.g. "ジャズっぽいもの"). Without it, the card's stored
// embedding is reused; with it, re-embed the card text plus the direction so
// the candidate pool also leans that way, and the LLM rerank is steered too.
export async function recallFromCard(
  cardId: string,
  scope: ProjectCardScope,
  direction?: string
): Promise<RecallResult[]> {
  const card = getCardById(cardId, scope.userId);
  if (!card || card.project_id !== scope.projectId) {
    throw new Error('想起元のカードが見つかりません。');
  }
  if (!card.embedding) {
    throw new Error('想起元のカードに埋め込みがありません。');
  }
  const queryText = cardEmbeddingText(card);
  const queryVector = direction
    ? await embed(`${queryText}\n方向性: ${direction}`)
    : (JSON.parse(card.embedding) as number[]);
  const cards = listCards(scope.projectId, scope.userId).filter(
    candidate => candidate.id !== card.id
  );
  if (cards.length === 0) return [];
  requireCardEmbeddings(cards, '想起用の埋め込みがないカードがあります。');
  return recallByVector(queryText, queryVector, cards, direction);
}
