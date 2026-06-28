import OpenAI from 'openai';
import { requireEnv } from '../require-env.js';

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

export const chatModel = requireEnv('OPENAI_MODEL');

// Lightweight model for recall selection/reason generation (rerank). It only
// reads short cards to pick relevant ones and add a brief reason, so use a
// fast model instead of the heavy dialogue model.
export const rankModel = requireEnv('RANK_MODEL');

// Compressing a session into a card defaults to the dialogue model but can be
// set independently.
export const compressModel = process.env.COMPRESS_MODEL ?? chatModel;

// Expanding a recall cue into mood words defaults to the fast model but can be
// set independently.
export const expandModel = process.env.EXPAND_MODEL ?? rankModel;

export const embedModel = requireEnv('OPENAI_EMBED_MODEL');
