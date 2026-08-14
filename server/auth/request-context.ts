import { AsyncLocalStorage } from 'node:async_hooks';

// Carries the signed-in account through a request without threading it into
// every function signature. Used where the caller is far from the route, such
// as recording which account an LLM call was billed against; per-account API
// keys will read from here too.
interface RequestContext {
  userId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

// Null outside a request (there is no ambient account to fall back to).
export function currentUserId(): string | null {
  return storage.getStore()?.userId ?? null;
}
