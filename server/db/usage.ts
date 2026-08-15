import { randomUUID } from 'node:crypto';
import { db } from './open.js';

export interface UsageRow {
  userId: string | null;
  use: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  searchCalls: number;
  costUsd: number | null;
}

export function insertUsage(row: UsageRow): void {
  db.prepare(
    `INSERT INTO llm_usage (id, created_at, user_id, use, provider, model,
       input_tokens, output_tokens, cached_input_tokens, search_calls, cost_usd)
     VALUES (@id, @created_at, @user_id, @use, @provider, @model,
       @input_tokens, @output_tokens, @cached_input_tokens, @search_calls,
       @cost_usd)`
  ).run({
    id: randomUUID(),
    created_at: new Date().toISOString(),
    user_id: row.userId,
    use: row.use,
    provider: row.provider,
    model: row.model,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    cached_input_tokens: row.cachedInputTokens,
    search_calls: row.searchCalls,
    cost_usd: row.costUsd,
  });
}

interface UsageTotals {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  search_calls: number;
  cost_usd: number;
}

interface UsageByUse extends UsageTotals {
  use: string;
}

interface UsageByModel extends UsageTotals {
  provider: string;
  model: string;
}

export interface UsageSummary {
  totals: UsageTotals;
  byUse: UsageByUse[];
  byModel: UsageByModel[];
}

const SUM = `COUNT(*) AS calls,
  COALESCE(SUM(input_tokens), 0) AS input_tokens,
  COALESCE(SUM(output_tokens), 0) AS output_tokens,
  COALESCE(SUM(search_calls), 0) AS search_calls,
  COALESCE(SUM(cost_usd), 0) AS cost_usd`;

// Usage is reported per account: with per-account API keys coming, each person
// should only ever see what their own key was spent on.
export function summarizeUsage(userId: string): UsageSummary {
  const totals = db
    .prepare(`SELECT ${SUM} FROM llm_usage WHERE user_id = ?`)
    .get(userId) as UsageTotals;
  const byUse = db
    .prepare(
      `SELECT use, ${SUM} FROM llm_usage WHERE user_id = ?
       GROUP BY use ORDER BY cost_usd DESC`
    )
    .all(userId) as UsageByUse[];
  const byModel = db
    .prepare(
      `SELECT provider, model, ${SUM} FROM llm_usage WHERE user_id = ?
       GROUP BY provider, model ORDER BY cost_usd DESC`
    )
    .all(userId) as UsageByModel[];
  return { totals, byUse, byModel };
}
