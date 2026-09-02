import { jsonComplete } from './run.js';
import { suggestPrompt } from './prompts/suggest.js';

// Ghost-text example for the fragment input, seeded from the Co-listener's
// last message. Returns null on any parse failure so a bad response just
// falls back to no suggestion rather than breaking the input.
export async function suggestFragment(
  lastComment: string
): Promise<string | null> {
  const raw = await jsonComplete('suggest', {
    model: suggestPrompt.model,
    system: suggestPrompt.system,
    user: lastComment,
  });
  try {
    const parsed = JSON.parse(raw || '{}') as { suggestion?: string };
    return typeof parsed.suggestion === 'string' ? parsed.suggestion : null;
  } catch {
    return null;
  }
}
