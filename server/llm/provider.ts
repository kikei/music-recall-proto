// Provider-neutral seam for the LLM calls the app makes. Each capability
// returns a normalized usage block so usage/cost can be recorded uniformly
// regardless of which vendor served the call. Adding a vendor means adding an
// implementation of LlmProvider, not touching the call sites.
export type ProviderName = 'openai';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type SearchMode = 'off' | 'auto' | 'required';
export type SearchContext = 'low' | 'medium' | 'high';

// Normalized token/search counts. Dollar cost is derived separately from a rate
// table (vendors do not return cost on the response).
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  searchCalls: number;
}

// A dialogue/research turn, optionally allowed to consult the web.
export interface RespondRequest {
  model: string;
  instructions: string;
  input: ChatTurn[];
  search: SearchMode;
  searchContext?: SearchContext;
}

// A single-shot completion constrained to JSON output.
export interface JsonRequest {
  model: string;
  system: string;
  user: string;
}

export interface EmbedRequest {
  model: string;
  input: string;
}

export interface LlmProvider {
  name: ProviderName;
  respond(req: RespondRequest): Promise<{ text: string; usage: LlmUsage }>;
  jsonComplete(req: JsonRequest): Promise<{ text: string; usage: LlmUsage }>;
  embed(req: EmbedRequest): Promise<{ vector: number[]; usage: LlmUsage }>;
}
