import type { HonoRequest } from 'hono';

export const INVALID_JSON_MESSAGE =
  'リクエスト本文を JSON オブジェクトとして読み取れません。';

// API request bodies are objects. A malformed body, array, scalar, or null is
// an invalid request rather than an empty object with every field omitted.
export async function readJsonObject(
  request: HonoRequest
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
