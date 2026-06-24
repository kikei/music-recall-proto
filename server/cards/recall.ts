import { listCards, getCard, type Card } from '../db/cards.js';
import { embed, cardEmbeddingText } from '../llm/embed.js';
import { cosineSimilarity } from './similarity.js';
import { rankRecall } from '../llm/rank.js';
import { parsePlayerJson } from '../player/parse-json.js';
import type { Player } from '../player/provider.js';

export interface RecallResult {
  id: string;
  title: string;
  artist: string;
  album: string | null;
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
const POOL_SIZE = 16;
// How many to finally surface.
const SHOW = 10;

// Match the cue vector against past cards and surface only a few.
// Embedding similarity is used only to gather candidates; the actual relevance
// judgment and ordering are done by the LLM (similarity can be flat across
// candidates for some queries and fails to work as a ranking).
async function recallByVector(
  queryText: string,
  queryVector: number[],
  excludeId?: string,
  direction?: string
): Promise<RecallResult[]> {
  const cards = listCards().filter(c => c.embedding && c.id !== excludeId);
  if (cards.length === 0) return [];

  const pool = cards
    .map(card => ({
      card,
      score: cosineSimilarity(queryVector, JSON.parse(card.embedding!)),
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
    direction
  );

  const byId = new Map(pool.map(card => [card.id, card]));
  const seen = new Set<string>();
  return ranked
    .filter(r => byId.has(r.id))
    .sort((a, b) => b.relevance - a.relevance)
    .filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .slice(0, SHOW)
    .map(r => toResult(byId.get(r.id)!, r.relevance, r.reason));
}

function toResult(card: Card, relevance: number, reason: string): RecallResult {
  return {
    id: card.id,
    title: card.title,
    artist: card.artist,
    album: card.album,
    hook: card.hook,
    recall_phrase: card.recall_phrase,
    background: card.background,
    relevance,
    reason,
    recall_count: card.recall_count,
    player: parsePlayerJson(card.player),
  };
}

// Recall from the current cue (free text).
export async function recall(query: string): Promise<RecallResult[]> {
  const cards = listCards().filter(c => c.embedding);
  if (cards.length === 0) return [];
  const queryVector = await embed(query);
  return recallByVector(query, queryVector, undefined);
}

// Recall starting from a single card. `direction` steers the recall toward a
// kind of music (e.g. "ジャズっぽいもの"). Without it, the card's stored
// embedding is reused; with it, re-embed the card text plus the direction so
// the candidate pool also leans that way, and the LLM rerank is steered too.
export async function recallFromCard(
  cardId: string,
  direction?: string
): Promise<RecallResult[]> {
  const card = getCard(cardId);
  if (!card?.embedding) return [];
  const queryText = cardEmbeddingText(card);
  const queryVector = direction
    ? await embed(`${queryText}\n方向性: ${direction}`)
    : (JSON.parse(card.embedding) as number[]);
  return recallByVector(queryText, queryVector, card.id, direction);
}
