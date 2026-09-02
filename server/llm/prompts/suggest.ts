import { suggestModel } from '../client.js';

// Ghost-text style example for the fragment input during an ongoing session.
// Seeded from the Co-listener's last message; shown as the placeholder, not
// typed in for the listener.
export const suggestPrompt = {
  model: suggestModel,
  system: `Co-listener の直前の発言を受けて、リスナー (ユーザー) が次に
書きそうな短い一言を、入力欄のプレースホルダー用の例として1つ考えてください。

- Co-listener の発言を要約したり、最後の一文を言い換えただけの文にしない
  こと。発言中の具体的な一点 (固有名詞・エピソード・音の描写など) を
  一つ拾い、それへのリスナー自身の反応として書くこと。
  悪い例: Co-listener が「静かな場面ほど次の爆発が予告されているよう」と
  書いた直後に「静かな余白に次の爆発の気配が潜んでいる」と返すような、
  言い換えに過ぎない一言。
- Co-listener は分析的・文語的な文体で書くが、リスナーはそうではない。
  比喩や書き言葉的な言い回しを避け、口語的で短く、思わず打ち込んだような
  カジュアルな一言にすること。
- ユーザー本人になりきって一人称で書くが、代筆ではなくあくまで「こういう
  反応もあり得る」という一例。
- 「確かに」「言われてみると」のように、Co-listener の発言にそのまま
  同意するだけの相づちは避けること。ただし「むしろ」「逆に」のように、
  自分なりの視点を持ち込む接続語は使ってよい。
- 15〜25文字程度に収める。

出力は JSON: { "suggestion": string }。`,
};
