import { openai } from './client.js';
import { stripTracking } from './strip-tracking.js';
import { continuePrompt } from './prompts/chat-continue.js';
import { researchPrompt } from './prompts/chat-research.js';
import { openingPrompt } from './prompts/chat-opening.js';
import type { Message } from '../db/messages.js';

interface Work {
  title: string;
  artist: string;
  album: string | null;
}

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
    model: continuePrompt.model,
    instructions: continuePrompt.system,
    input,
    tools: [{ type: 'web_search' }],
    tool_choice: forceSearch ? 'required' : 'auto',
  });

  return stripTracking(response.output_text.trim());
}

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
    model: researchPrompt.model,
    instructions: researchPrompt.system,
    input,
    tools: [{ type: 'web_search' }],
    tool_choice: 'required',
  });

  return stripTracking(response.output_text.trim());
}

// Opening message when starting without a memo. Without waiting for user
// input, search the web for the work and present background and highlights.
export async function openingMessage(
  work: Work,
  forceSearch = false
): Promise<string> {
  const album = work.album ? ` / アルバム: ${work.album}` : '';
  const response = await openai().responses.create({
    model: openingPrompt.model,
    instructions: openingPrompt.system,
    input: `これから聴く対象: ${work.title} / ${work.artist}${album}`,
    tools: [{ type: 'web_search' }],
    tool_choice: forceSearch ? 'required' : 'auto',
  });

  return stripTracking(response.output_text.trim());
}
