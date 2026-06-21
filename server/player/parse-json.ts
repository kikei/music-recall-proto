import type { Player } from './provider.js';

// Restore the stored player (a Player JSON string) back to an object.
// Returns null when the value is missing or malformed.
export function parsePlayerJson(raw: string | null): Player | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Player;
  } catch {
    return null;
  }
}
