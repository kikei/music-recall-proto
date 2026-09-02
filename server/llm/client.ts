import OpenAI from 'openai';
import { modelConfig } from './model-config.js';
import { openaiKey } from '../credentials/resolve.js';

// Built per call from the signed-in account's own key, so one person's requests
// are never billed to another's key. Deliberately not cached in a module-level
// client: that was fine when a single key came from the environment, but here
// it would pin whichever account happened to call first. The SDK client is
// little more than configuration, so constructing one per call is cheap.
export function openai(): OpenAI {
  return new OpenAI({ apiKey: openaiKey() });
}

export const chatModel = modelConfig.models.chat;
export const rankModel = modelConfig.models.rank;
export const compressModel = modelConfig.models.compress;
export const expandModel = modelConfig.models.expand;
export const embedModel = modelConfig.models.embed;
export const suggestModel = modelConfig.models.suggest;
