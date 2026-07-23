import { respond } from './run.js';
import { stripTracking } from './strip-tracking.js';
import { continuePrompt } from './prompts/chat-continue.js';
import { researchPrompt } from './prompts/chat-research.js';
import { openingPrompt } from './prompts/chat-opening.js';
import type { Message } from '../db/messages.js';

interface Work {
  title: string;
  artist: string;
}

export async function continueSession(
  work: Work,
  history: Message[],
  forceSearch = false
): Promise<string> {
  const input = [
    {
      role: 'user' as const,
      content: `今聴いている対象: ${work.title} / ${work.artist}`,
    },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  // A normal comment turn does not search: the per-turn search was the biggest
  // silent cost driver, and the user can press "research" to consult the web.
  // Search runs only when forced (the opening turn, or a session started from a
  // memo / continued conversation).
  const text = await respond('chat.continue', {
    model: continuePrompt.model,
    instructions: continuePrompt.system,
    input,
    search: forceSearch ? 'required' : 'off',
  });

  return stripTracking(text.trim());
}

// When the user presses the "research" button. Always run a web search and
// share the findings.
export async function researchSession(
  work: Work,
  history: Message[]
): Promise<string> {
  const input = [
    {
      role: 'user' as const,
      content: `今聴いている対象: ${work.title} / ${work.artist}`,
    },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  // The explicit research button is user-initiated and rare, so spend a bit
  // more context here (medium) than the default low used elsewhere.
  const text = await respond('chat.research', {
    model: researchPrompt.model,
    instructions: researchPrompt.system,
    input,
    search: 'required',
    searchContext: 'medium',
  });

  return stripTracking(text.trim());
}

// Opening message when starting without a memo. Without waiting for user
// input, search the web for the work and present background and highlights.
export async function openingMessage(
  work: Work,
  forceSearch = false
): Promise<string> {
  const text = await respond('chat.opening', {
    model: openingPrompt.model,
    instructions: openingPrompt.system,
    input: [
      {
        role: 'user',
        content: `これから聴く対象: ${work.title} / ${work.artist}`,
      },
    ],
    search: forceSearch ? 'required' : 'auto',
  });

  return stripTracking(text.trim());
}
