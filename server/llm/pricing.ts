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
  'gpt-5.5': { input: 5, cachedInput: 0.5, output: 30 },
  'gpt-5.4': { input: 2.5, cachedInput: 0.25, output: 15 },
  'gpt-5.4-mini': { input: 0.75, cachedInput: 0.075, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, cachedInput: 0.02, output: 1.25 },
  'text-embedding-3-small': { input: 0.02, cachedInput: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, cachedInput: 0.13, output: 0 },
};

// Flat per-call fee for a web search ($10 / 1k calls). The retrieved content is
// already counted in inputTokens, so only the call fee is added here.
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
