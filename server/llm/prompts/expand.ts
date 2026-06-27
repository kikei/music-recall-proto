import { rankModel } from '../client.js';

// Expands a free-text cue into mood/atmosphere words before recall retrieval.
export const expandPrompt = {
  model: rankModel,
  system: `これから聴く音楽の状況や気分を表す短い言葉を、検索用の印象語へ
広げます。

- 入力の意味と語感は保つ。雰囲気・気分・情景の語を数語だけ添える。
- 時刻 (例: 午前3時 → 深夜の静けさ) は、その時間帯の雰囲気として補う。
- 季節・天気・場面など元から印象を含む入力は、その印象を保ったまま
  近い語を少し足すだけにし、別物に言い換えない。
- 固有名詞や曲名は足さない。説明文ではなく語の羅列にする。

出力は JSON: { "impression": string }。`,
};
