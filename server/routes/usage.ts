import { Hono } from 'hono';
import { summarizeUsage } from '../db/usage.js';
import type { AppEnv } from '../auth/require-user.js';

export const usage = new Hono<AppEnv>();

// Aggregated LLM usage and derived cost, for analysis. Raw per-call rows live in
// the llm_usage table; this is the summary surface.
usage.get('/', c => c.json(summarizeUsage(c.get('userId'))));
