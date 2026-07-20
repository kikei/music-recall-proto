import { modelConfig } from './model-config.js';

// Per-model request options merged into OpenAI API calls. Which parameters a
// model accepts -- and which values are valid -- differs per model: gpt-5
// reasoning models take reasoning_effort 'none' | 'low' | 'medium' | 'high' |
// 'xhigh', while other models reject the field entirely. The options are config
// data keyed by model (see model-config), not values hardcoded at call sites.
export function openaiModelOptions(model: string): Record<string, unknown> {
  return modelConfig.modelOptions[model] ?? {};
}
