import { openai } from './client.js';
import { stripTracking } from './strip-tracking.js';
import { compressPrompt } from './prompts/compress.js';
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

export async function compressSession(
  work: Work,
  history: Message[]
): Promise<CompressedCard> {
  const transcript = history
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'Co-listener'}: ${m.content}`)
    .join('\n');
  const album = work.album ?? '不明';
  const user = `対象: ${work.title} / ${work.artist} (収録アルバム: ${album})

--- セッションの対話 ---
${transcript}`;

  const completion = await openai().chat.completions.create({
    model: compressPrompt.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: compressPrompt.system },
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
