import { openai } from './client.js';
import { webSearchTool } from './web-search.js';
import type {
  LlmProvider,
  LlmUsage,
  RespondRequest,
  JsonRequest,
  EmbedRequest,
} from './provider.js';

// OpenAI implementation of the provider seam. Dialogue/research goes through the
// Responses API (with the web_search tool); JSON tasks and embeddings go through
// Chat Completions and the embeddings endpoint. Each method normalizes the
// vendor's usage shape into LlmUsage.
export const openaiProvider: LlmProvider = {
  name: 'openai',

  async respond(req: RespondRequest) {
    const response = await openai().responses.create({
      model: req.model,
      instructions: req.instructions,
      input: req.input,
      ...(req.search === 'off'
        ? {}
        : {
            tools: [webSearchTool(req.searchContext)],
            tool_choice: req.search,
          }),
    });
    const u = response.usage;
    const usage: LlmUsage = {
      inputTokens: u?.input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      cachedInputTokens: u?.input_tokens_details?.cached_tokens ?? 0,
      searchCalls: (response.output ?? []).filter(
        o => o.type === 'web_search_call'
      ).length,
    };
    return { text: response.output_text, usage };
  },

  async jsonComplete(req: JsonRequest) {
    const completion = await openai().chat.completions.create({
      model: req.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
    });
    const u = completion.usage;
    const usage: LlmUsage = {
      inputTokens: u?.prompt_tokens ?? 0,
      outputTokens: u?.completion_tokens ?? 0,
      cachedInputTokens: u?.prompt_tokens_details?.cached_tokens ?? 0,
      searchCalls: 0,
    };
    return { text: completion.choices[0]?.message.content ?? '', usage };
  },

  async embed(req: EmbedRequest) {
    const response = await openai().embeddings.create({
      model: req.model,
      input: req.input,
    });
    const u = response.usage;
    const usage: LlmUsage = {
      inputTokens: u?.prompt_tokens ?? 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      searchCalls: 0,
    };
    return { vector: response.data[0].embedding, usage };
  },
};
