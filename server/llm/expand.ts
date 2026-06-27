import { openai } from './client.js';
import { expandPrompt } from './prompts/expand.js';

// Expand a free-text cue into mood/atmosphere words before retrieval. A bare
// cue like "午前3時に聴く曲" carries almost no signal in the embedding (the
// digit barely moves the vector and the model does not infer the feel of that
// hour), so we turn it into impression words that actually drive both the
// candidate gathering and the rerank. Returns '' on failure so recall can fall
// back to the raw cue.
export async function expandCue(query: string): Promise<string> {
  try {
    const completion = await openai().chat.completions.create({
      model: expandPrompt.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: expandPrompt.system },
        { role: 'user', content: query },
      ],
    });
    const raw = completion.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(raw) as { impression?: string };
    return parsed.impression?.trim() ?? '';
  } catch {
    // An expansion failure should not break recall; fall back to the raw cue.
    return '';
  }
}
