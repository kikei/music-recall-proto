import { openai } from './client.js';
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
        `想起フレーズ: ${c.recall_phrase}\n背景: ${c.background}`
    )
    .join('\n---\n');
  const steer = direction
    ? `\n\n想起の方向性 (この方向に沿う候補をやや優先しつつ、きっかけとの` +
      `接続を最優先する): ${direction}`
    : '';
  const user =
    `今のきっかけ:\n${query}${steer}\n\n` + `=== 再会カード候補 ===\n${cards}`;

  const completion = await openai().chat.completions.create({
    model: rankPrompt.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: rankPrompt.system(limit) },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message.content ?? '{}';
  const parsed = JSON.parse(raw) as { results?: RankedRecall[] };
  return parsed.results ?? [];
}
