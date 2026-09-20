import { jsonComplete } from './run.js';
import { stripTracking } from './strip-tracking.js';
import { compressPrompt } from './prompts/compress.js';
import type { Message } from '../db/messages.js';

interface Work {
  title: string;
  artist: string;
}

export interface CompressedCard {
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
}

export function parseCompressedCard(raw: string): CompressedCard {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') {
    throw new Error('カード生成結果の形式が正しくありません。');
  }
  const card = value as Record<string, unknown>;
  const fields = ['title', 'artist', 'hook', 'recall_phrase', 'background'];
  if (fields.some(field => typeof card[field] !== 'string')) {
    throw new Error('カード生成結果の形式が正しくありません。');
  }
  const title = (card.title as string).trim();
  const artist = (card.artist as string).trim();
  if (!title || !artist) {
    throw new Error('カード生成結果に対象名またはアーティストがありません。');
  }
  const result = {
    title,
    artist,
    hook: stripTracking(card.hook as string).trim(),
    recall_phrase: stripTracking(card.recall_phrase as string).trim(),
    background: stripTracking(card.background as string).trim(),
  };
  if (!result.hook || !result.recall_phrase || !result.background) {
    throw new Error('カード生成結果に必要な本文がありません。');
  }
  return result;
}

export async function compressSession(
  work: Work,
  history: Message[]
): Promise<CompressedCard> {
  const transcript = history
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'Co-listener'}: ${m.content}`)
    .join('\n');
  const user = `対象: ${work.title} / ${work.artist}

--- セッションの対話 ---
${transcript}`;

  const raw = await jsonComplete('compress', {
    model: compressPrompt.model,
    system: compressPrompt.system,
    user,
  });
  return parseCompressedCard(raw);
}
