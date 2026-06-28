import type { LlmProvider, ProviderName } from './provider.js';
import { openaiProvider } from './openai-provider.js';

const providers: Record<ProviderName, LlmProvider> = {
  openai: openaiProvider,
};

// Default provider for every use; a single call can override it. Per-use
// switching lands here once a second provider exists.
export const defaultProvider = (process.env.LLM_PROVIDER ||
  'openai') as ProviderName;

export function getProvider(name: ProviderName = defaultProvider): LlmProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`未知の LLM プロバイダ: ${name}`);
  }
  return provider;
}
