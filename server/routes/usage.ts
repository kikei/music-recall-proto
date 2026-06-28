import { Hono } from 'hono';
import { summarizeUsage } from '../db/usage.js';

export const usage = new Hono();

// Aggregated LLM usage and derived cost, for analysis. Raw per-call rows live in
// the llm_usage table; this is the summary surface.
usage.get('/', c => c.json(summarizeUsage()));
