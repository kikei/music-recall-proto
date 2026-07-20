import type { SearchContext } from './provider.js';
import { modelConfig } from './model-config.js';

// Web search is the most expensive lever in the LLM path: each call carries a
// fixed per-call fee, and the content it retrieves is billed as model input
// tokens. `search_context_size` is the one knob that trims the retrieved
// content (the fixed fee is flat across sizes); its default lives in
// model-config, and callers can raise it where the extra context is worth it.

// Build the web_search tool with a chosen context size. Callers pass a larger
// size only where the extra context pays off (e.g. explicit deep research).
export function webSearchTool(
  size: SearchContext = modelConfig.webSearchContext
) {
  return { type: 'web_search' as const, search_context_size: size };
}
