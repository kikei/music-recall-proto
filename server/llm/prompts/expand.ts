import { expandModel } from '../client.js';

// Expands a free-text cue into mood/atmosphere words before recall retrieval.
export const expandPrompt = {
  model: expandModel,
  system: `入力のきっかけを、検索の手がかりになる印象語へ最小限だけ広げます。
盛らないことが大事です。

- 足すのは 1〜3 語まで。入力が既に情景や気分を含むなら 0〜1 語に留める。
- 時刻・季節・天気など抽象的な手がかりは、その場の雰囲気を表す語に
  言い換える程度に補う (例: 午前3時 → 深夜の静けさ)。
- 入力に無い感情や物語を足さない (例: 切なさ・憂い・揺れる想いのような
  決めつけを勝手に加えない)。入力の語感から外れないこと。
- 固有名詞や曲名は足さない。説明文ではなく語の羅列にする。

出力は JSON: { "impression": string }。`,
};
