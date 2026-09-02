import type { LlmUsage } from './provider.js';

// USD per 1M tokens, keyed by model. Vendors do not return dollar cost, so we
// derive it here. `cachedInput` is the discounted rate for the cached portion
// of the input (usage.cachedInputTokens). Models not listed yield a null cost;
// the raw token counts are still recorded, so cost can be backfilled once a
// rate is added.
interface Rate {
  input: number;
  cachedInput: number;
  output: number;
}

const rates: Record<string, Rate> = {
  'gpt-5.6-sol': { input: 4, cachedInput: 0.4, output: 20 },
  'gpt-5.6-terra': { input: 2, cachedInput: 0.2, output: 12 },
  'gpt-5.6-luna': { input: 0.2, cachedInput: 0.02, output: 1.2 },
  'gpt-5.5': { input: 5, cachedInput: 0.5, output: 30 },
  'gpt-5.4': { input: 2.5, cachedInput: 0.25, output: 15 },
  // cachedInput not published for this tier; inferred from the ~10%-of-input
  // ratio that holds for every other model in this table.
  'gpt-5-mini': { input: 0.25, cachedInput: 0.025, output: 2 },
  'text-embedding-3-small': { input: 0.02, cachedInput: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, cachedInput: 0.13, output: 0 },
};

// Flat per-call fee for a web search. OpenAI splits this $10 / 1k calls for
// reasoning models vs $25 / 1k for non-reasoning models; which bucket the
// current chat model (gpt-5.6-terra) falls into hasn't been confirmed against
// actual billing yet, so this may be understating real cost by up to 2.5x.
const WEB_SEARCH_USD_PER_CALL = 0.01;

export function estimateCost(model: string, usage: LlmUsage): number | null {
  const rate = rates[model];
  if (!rate) return null;
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const fresh = usage.inputTokens - cached;
  const tokenCost =
    (fresh * rate.input +
      cached * rate.cachedInput +
      usage.outputTokens * rate.output) /
    1e6;
  return tokenCost + usage.searchCalls * WEB_SEARCH_USD_PER_CALL;
}
