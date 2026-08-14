import { getProvider } from './providers.js';
import { estimateCost } from './pricing.js';
import { insertUsage } from '../db/usage.js';
import { currentUserId } from '../auth/request-context.js';
import type {
  ProviderName,
  RespondRequest,
  JsonRequest,
  EmbedRequest,
  LlmUsage,
} from './provider.js';

// Single chokepoint for every LLM call: pick the provider, run the call, and
// record one usage row. `use` labels the call site (e.g. 'chat.opening') so
// usage can be sliced by purpose. Recording is best-effort and never breaks the
// call.
function record(
  use: string,
  provider: ProviderName,
  model: string,
  usage: LlmUsage
): void {
  try {
    insertUsage({
      // Which account to bill this to, taken from the request context so the
      // account does not have to be threaded through every LLM call site.
      userId: currentUserId(),
      use,
      provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      searchCalls: usage.searchCalls,
      costUsd: estimateCost(model, usage),
    });
  } catch (err) {
    console.error('[llm-usage]', err);
  }
}

export async function respond(
  use: string,
  req: RespondRequest,
  provider?: ProviderName
): Promise<string> {
  const p = getProvider(provider);
  const { text, usage } = await p.respond(req);
  record(use, p.name, req.model, usage);
  return text;
}

export async function jsonComplete(
  use: string,
  req: JsonRequest,
  provider?: ProviderName
): Promise<string> {
  const p = getProvider(provider);
  const { text, usage } = await p.jsonComplete(req);
  record(use, p.name, req.model, usage);
  return text;
}

export async function embedVector(
  use: string,
  req: EmbedRequest,
  provider?: ProviderName
): Promise<number[]> {
  const p = getProvider(provider);
  const { vector, usage } = await p.embed(req);
  record(use, p.name, req.model, usage);
  return vector;
}
