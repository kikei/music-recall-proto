import { openai } from './client.js';
import { webSearchTool } from './web-search.js';
import { openaiModelOptions } from './openai-model-options.js';
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
      ...openaiModelOptions(req.model),
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
    if (!response.output_text.trim()) {
      throw new Error('LLM から応答本文が返されませんでした。');
    }
    return { text: response.output_text, usage };
  },

  async jsonComplete(req: JsonRequest) {
    const completion = await openai().chat.completions.create({
      model: req.model,
      response_format: { type: 'json_object' },
      ...openaiModelOptions(req.model),
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
    const text = completion.choices[0]?.message.content;
    if (!text?.trim()) {
      throw new Error('LLM から JSON 応答が返されませんでした。');
    }
    return { text, usage };
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
    const vector = response.data[0]?.embedding;
    if (!vector) throw new Error('LLM から埋め込みが返されませんでした。');
    return { vector, usage };
  },
};
