import { openai, chatModel } from './client.js';
import { stripTracking } from './strip-tracking.js';
import type { Message } from '../db/messages.js';

interface Work {
  title: string;
  artist: string;
  album: string | null;
}

export interface CompressedCard {
  title: string;
  artist: string;
  album: string | null;
  hook: string;
  recall_phrase: string;
  background: string;
}

const system = `あなたは音楽ソムリエです。1 回の聴取セッションの対話を、後日
ふたたびこの音楽を思い出すための「再会カード」へ圧縮します。

対象は曲のことも、アルバム全体のこともあります。対象の単位に合わせて書くこと。

出力は JSON で、次のキーを持たせてください。
- title: 対象名 (曲名またはアルバム名)
- artist: アーティスト名
- album: 収録アルバム名。対象がアルバムそのもの、または不明なら null
- hook: 引っかかり。なぜこの音楽が流れずに残ったか。ユーザー自身の反応を短く。
- recall_phrase: 想起フレーズ。後で読むと音や情景が戻る、中粒度で具体的な手掛かり。
  音・楽器・構造・場面を凝縮した一文〜数語の連なり。
- background: 背景。記事・レビュー・制作意図・LLM の解釈など聴取を支える文脈。

感想の代筆ではなく、後で再会するための札を作ること。日本語で簡潔に。`;

export async function compressSession(
  work: Work,
  history: Message[]
): Promise<CompressedCard> {
  const transcript = history
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'ソムリエ'}: ${m.content}`)
    .join('\n');
  const album = work.album ?? '不明';
  const user = `対象: ${work.title} / ${work.artist} (収録アルバム: ${album})

--- セッションの対話 ---
${transcript}`;

  const completion = await openai().chat.completions.create({
    model: chatModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message.content ?? '{}';
  const parsed = JSON.parse(raw) as Partial<CompressedCard>;
  return {
    title: parsed.title || work.title,
    artist: parsed.artist || work.artist,
    album: parsed.album ?? work.album,
    hook: stripTracking(parsed.hook ?? ''),
    recall_phrase: stripTracking(parsed.recall_phrase ?? ''),
    background: stripTracking(parsed.background ?? ''),
  };
}
