// Web search is the most expensive lever in the LLM path: each call carries a
// fixed per-call fee, and the content it retrieves is billed as model input
// tokens. `search_context_size` is the one knob that trims the retrieved
// content (the fixed fee is flat across sizes), so default to 'low' and let
// WEB_SEARCH_CONTEXT raise it per deployment when the extra context is worth it.
type ContextSize = 'low' | 'medium' | 'high';

const envSize = process.env.WEB_SEARCH_CONTEXT;
const defaultSize: ContextSize =
  envSize === 'medium' || envSize === 'high' ? envSize : 'low';

// Build the web_search tool with a chosen context size. Callers pass a larger
// size only where the extra context pays off (e.g. explicit deep research).
export function webSearchTool(size: ContextSize = defaultSize) {
  return { type: 'web_search' as const, search_context_size: size };
}
