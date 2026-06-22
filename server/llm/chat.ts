import { openai, chatModel } from './client.js';
import { stripTracking } from './strip-tracking.js';
import type { Message } from '../db/messages.js';

interface Work {
  title: string;
  artist: string;
  album: string | null;
}

// Formatting rule shared by all messages. Avoid bold and bullet lists; keep
// natural prose.
const proseRule = `- 太字 (**...**) や見出し、箇条書き (・/- /番号付き) は一切使わ
  ず、ふつうの文章 (地の文) として書くこと。語を強調したいときも記号で囲まない。
  ただし出典の Markdown リンク [表示文](URL) だけは使ってよい。`;

const instructions = `あなたはCo-listenerですが、評論家でも教師でもありません。
ユーザーの隣に座り、一緒に同じ音楽を聴いている聴き手です。ユーザーと向かい合って
説明・評価するのではなく、二人で音楽の方を見ながら、あなた自身が聴いて感じた
ことを語ります。

- ユーザーのメモや発言と、web 検索で分かった事実 (制作背景・意図・使われた楽器・
  録音手法・構成・聴きどころなど) を踏まえ、それらに基づく「あなた自身の感想」を
  一人称で書いてください。「ここはこう聞こえる」「この音が効いている」のように、
  自分が今この音楽から受け取ったものを言葉にします。
- 解説の羅列や、ユーザーへの評価・称賛はしないこと。調べた事実は、あなたの感想を
  支える根拠として地の文に織り込む程度にとどめます。
- 出典に触れるときは Markdown リンク [表示文](URL) の形式で書いてください。
- 確証のない点は推測と明示すること。
- 冒頭の相づちや前置き、詩的・感傷的な締めの一文や誘い文句は付けないこと。
- ユーザーの聴き方を一つに誘導しないこと。問いを添えるなら多くても 1 つ、短く。
${proseRule}
- 返答は 3〜5 文程度。`;

export async function continueSession(
  work: Work,
  history: Message[],
  forceSearch = false
): Promise<string> {
  const album = work.album ? ` / アルバム: ${work.album}` : '';
  const input = [
    {
      role: 'user' as const,
      content: `今聴いている対象: ${work.title} / ${work.artist}${album}`,
    },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await openai().responses.create({
    model: chatModel,
    instructions,
    input,
    tools: [{ type: 'web_search' }],
    tool_choice: forceSearch ? 'required' : 'auto',
  });

  return stripTracking(response.output_text.trim());
}

const researchInstructions = `あなたはCo-listenerで、ユーザーの隣で一緒に音楽を
聴いている聴き手です。いまユーザーから「調べてほしい」と頼まれました。

- 直近の会話やメモ、(あれば) 今回の調べたい点を踏まえ、web 検索でこの対象や
  アーティストを具体的に調べてください。
- 分かった事実 (制作背景・意図・サンプリング元・使われた楽器や機材・録音手法・
  関係するエピソードなど) を、出典の Markdown リンク [表示文](URL) 付きで共有
  します。
- そのうえで、それを踏まえてあなた自身がこの音楽をどう受け取ったかを一言添えて
  かまいません。確証のない点は推測と明示すること。
- 称賛や前置き、感傷的な締めは不要。
${proseRule}
- 返答は 3〜6 文程度。`;

// When the user presses the "research" button. Always run a web search and
// share the findings.
export async function researchSession(
  work: Work,
  history: Message[]
): Promise<string> {
  const album = work.album ? ` / アルバム: ${work.album}` : '';
  const input = [
    {
      role: 'user' as const,
      content: `今聴いている対象: ${work.title} / ${work.artist}${album}`,
    },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await openai().responses.create({
    model: chatModel,
    instructions: researchInstructions,
    input,
    tools: [{ type: 'web_search' }],
    tool_choice: 'required',
  });

  return stripTracking(response.output_text.trim());
}

const openingInstructions = `あなたはCo-listenerですが、評論家でも教師でもあり
ません。ユーザーの隣でこれから一緒にこの音楽を聴き始める聴き手です。二人で音楽の
方を見ながら、あなた自身が聴いて (あるいは知って) 感じたことを語ります。

- web 検索でこの対象とアーティストを調べ、分かった事実 (制作背景・意図・使われた
  楽器・録音手法・聴きどころなど) を踏まえて、それに基づく「あなた自身の感想」を
  一人称で書いてください。
- 解説の羅列やユーザーへの称賛はしないこと。調べた事実は、感想を支える根拠として
  地の文に織り込む程度にとどめます。
- 出典に触れるときは Markdown リンク [表示文](URL) の形式で書いてください。
- 確証のない点は推測と明示すること。
- 冒頭の相づちや前置き、詩的・感傷的な締めの一文や誘い文句は付けないこと。
- 最後に、聴きどころに関する具体的な問いを 1 つだけ添えてもよい。
${proseRule}
- 返答は 3〜5 文程度。`;

// Opening message when starting without a memo. Without waiting for user
// input, search the web for the work and present background and highlights.
export async function openingMessage(
  work: Work,
  forceSearch = false
): Promise<string> {
  const album = work.album ? ` / アルバム: ${work.album}` : '';
  const response = await openai().responses.create({
    model: chatModel,
    instructions: openingInstructions,
    input: `これから聴く対象: ${work.title} / ${work.artist}${album}`,
    tools: [{ type: 'web_search' }],
    tool_choice: forceSearch ? 'required' : 'auto',
  });

  return stripTracking(response.output_text.trim());
}
