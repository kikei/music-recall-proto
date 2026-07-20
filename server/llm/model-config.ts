import type { ProviderName, SearchContext } from './provider.js';

// Central, in-repo configuration for the LLM models the app uses. Model choices
// live here (not in env) so they are versioned with the code and reviewed like
// any other change. Only the API key stays in the environment, since it is a
// secret and must not be committed.
interface ModelConfig {
  // Default provider for every call, behind the provider seam.
  provider: ProviderName;
  // Model per call site.
  models: {
    // Dialogue and research. Must be web-search capable.
    chat: string;
    // Recall selection/reason generation (rerank). A fast model: it only reads
    // short cards to pick relevant ones and add a brief reason.
    rank: string;
    // Compressing a session into a card.
    compress: string;
    // Expanding a recall cue into mood words.
    expand: string;
    // Semantic search embedding for recall.
    embed: string;
  };
  // Default web_search context size. Lower trims the retrieved content billed
  // as input tokens (the flat per-call fee is the same across sizes).
  webSearchContext: SearchContext;
  // Per-model request options merged into the provider's API call. Which fields
  // exist and which values are valid differ per model, so this is config data
  // keyed by model, not values hardcoded at the call sites.
  modelOptions: Record<string, Record<string, unknown>>;
}

export const modelConfig: ModelConfig = {
  provider: 'openai',
  models: {
    chat: 'gpt-5.1',
    rank: 'gpt-5.4-nano',
    compress: 'gpt-5.4-mini',
    expand: 'gpt-5.4-nano',
    embed: 'text-embedding-3-small',
  },
  webSearchContext: 'low',
  modelOptions: {
    // Structured retrieval tasks (rerank, cue expansion) run on small reasoning
    // models. Turning reasoning off keeps them from spending thousands of slow
    // output tokens for no quality gain.
    'gpt-5.4-nano': { reasoning_effort: 'none' },
    'gpt-5-nano': { reasoning_effort: 'none' },
  },
};
