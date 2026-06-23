import { openai, rankModel } from './client.js';

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

const system = `あなたは Co-listener で、ユーザーの隣で一緒に音楽を聴いている聴き手
です。ユーザーの「今のきっかけ」と、候補の再会カード群を照合します。

- 候補の中から、今のきっかけと実際に接続するカードだけを選んでください。少しでも
  接続が感じられないものは選ばないこと (無理に正当化しない)。1 つも合わなければ
  空にする。
- 選んだカードには、今のきっかけと過去のカードの具体的な接続点 (音・楽器・構造・
  場面・背景の重なり) を 1〜2 文で示してください。これが「なぜ今これが想起された
  か」になります。
- relevance は 0〜1 の関連度。関連度の高い順に並べ、最大 3 件まで。
- 称賛や前置き、感傷的な締めは不要。日本語で。

出力は JSON: { "results": [ { "id": string, "relevance": number,
"reason": string } ] }。関連すると判断したものだけを含めること。`;

// Have the LLM select and reorder the embedding-gathered candidates by their
// actual connection strength. `direction` (optional) steers the recall toward
// a kind of music the user asked for (e.g. "ジャズっぽいもの").
export async function rankRecall(
  query: string,
  candidates: RecallCandidate[],
  direction?: string
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
    model: rankModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message.content ?? '{}';
  const parsed = JSON.parse(raw) as { results?: RankedRecall[] };
  return parsed.results ?? [];
}
