import OpenAI from 'openai';
import { modelConfig } from './model-config.js';

let client: OpenAI | null = null;

// Lazily create the client on the first LLM call so the server can start even
// without a key. Throw a clear error if it is unset. The key is the one setting
// that stays in the environment (a secret); model choices live in model-config.
export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が未設定です。.env に設定してください。');
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const chatModel = modelConfig.models.chat;
export const rankModel = modelConfig.models.rank;
export const compressModel = modelConfig.models.compress;
export const expandModel = modelConfig.models.expand;
export const embedModel = modelConfig.models.embed;
