import { jsonComplete } from './run.js';
import { rankPrompt } from './prompts/rank.js';

export interface RecallCandidate {
  id: string;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
}

export interface RankedRecall {
  id: string;
  relevance: number; // 0 to 1
  reason: string;
}

export function parseRankedRecall(raw: string): RankedRecall[] {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') {
    throw new Error('想起結果の形式が正しくありません。');
  }
  const results = (value as Record<string, unknown>).results;
  if (!Array.isArray(results)) {
    throw new Error('想起結果の形式が正しくありません。');
  }
  return results.map(item => {
    if (!item || typeof item !== 'object') {
      throw new Error('想起結果の形式が正しくありません。');
    }
    const result = item as Record<string, unknown>;
    if (
      typeof result.id !== 'string' ||
      !result.id ||
      typeof result.relevance !== 'number' ||
      !Number.isFinite(result.relevance) ||
      result.relevance < 0 ||
      result.relevance > 1 ||
      typeof result.reason !== 'string' ||
      !result.reason.trim()
    ) {
      throw new Error('想起結果の形式が正しくありません。');
    }
    return {
      id: result.id,
      relevance: result.relevance,
      reason: result.reason.trim(),
    };
  });
}

// Have the LLM select and reorder the embedding-gathered candidates by their
// actual connection strength. `direction` (optional) steers the recall toward
// a kind of music the user asked for (e.g. "ジャズっぽいもの").
export async function rankRecall(
  query: string,
  candidates: RecallCandidate[],
  direction?: string,
  limit = 3
): Promise<RankedRecall[]> {
  const cards = candidates
    .map(
      c =>
        `id: ${c.id}\n曲: ${c.title} / ${c.artist}\n引っかかり: ${c.hook}\n` +
        `想起フレーズ: ${c.recall_phrase}\n`
    )
    .join('\n---\n');
  const steer = direction
    ? `\n\n想起の方向性: ${direction}\nユーザーが明示的に指定した希望なので、` +
      `優先して沿わせること。きっかけとの繋がりが薄い候補でも、この方向に` +
      `合っていれば採用してよい。`
    : '';
  const user =
    `今のきっかけ:\n${query}${steer}\n\n` + `=== 再会カード候補 ===\n${cards}`;

  const raw = await jsonComplete('rank', {
    model: rankPrompt.model,
    system: rankPrompt.system(limit),
    user,
  });
  return parseRankedRecall(raw);
}
