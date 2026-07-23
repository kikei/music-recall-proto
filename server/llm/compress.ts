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
  const parsed = JSON.parse(raw || '{}') as Partial<CompressedCard>;
  return {
    title: parsed.title || work.title,
    artist: parsed.artist || work.artist,
    hook: stripTracking(parsed.hook ?? ''),
    recall_phrase: stripTracking(parsed.recall_phrase ?? ''),
    background: stripTracking(parsed.background ?? ''),
  };
}
