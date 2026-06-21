import OpenAI from 'openai';

let client: OpenAI | null = null;

// Lazily create the client on the first LLM call so the server can start even
// without a key. Throw a clear error if it is unset.
export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が未設定です。.env に設定してください。');
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const chatModel = process.env.OPENAI_MODEL ?? 'gpt-5.5';

// Lightweight model for recall selection/reason generation (rerank). It only
// reads short cards to pick relevant ones and add a brief reason, so use a
// fast model instead of the heavy dialogue model.
export const rankModel = process.env.RANK_MODEL ?? 'gpt-4o-mini';

export const embedModel =
  process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small';
