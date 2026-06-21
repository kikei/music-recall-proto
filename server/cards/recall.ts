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
// here; it is a wide net to avoid missing relevant cards.
const POOL_SIZE = 8;
// How many to finally surface.
const SHOW = 3;

// Match the cue vector against past cards and surface only a few.
// Embedding similarity is used only to gather candidates; the actual relevance
// judgment and ordering are done by the LLM (similarity can be flat across
// candidates for some queries and fails to work as a ranking).
async function recallByVector(
  queryText: string,
  queryVector: number[],
  excludeId?: string
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
    }))
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

// Recall starting from a single card, reusing its stored embedding.
export async function recallFromCard(cardId: string): Promise<RecallResult[]> {
  const card = getCard(cardId);
  if (!card?.embedding) return [];
  const queryVector = JSON.parse(card.embedding) as number[];
  const queryText = cardEmbeddingText(card);
  return recallByVector(queryText, queryVector, card.id);
}
