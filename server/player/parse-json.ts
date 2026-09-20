import type { Player } from './provider.js';

// Restore the stored player (a Player JSON string) back to an object. Missing
// is a valid state; malformed stored data is a database error and must surface.
export function parsePlayerJson(raw: string | null): Player | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') {
    throw new Error('保存されたプレイヤー情報の形式が正しくありません。');
  }
  const player = value as Record<string, unknown>;
  const hasId = typeof player.id === 'string' && player.id.length > 0;
  if (
    hasId &&
    (player.provider === 'youtube' || player.provider === 'niconico')
  ) {
    return value as Player;
  }
  if (
    hasId &&
    player.provider === 'spotify' &&
    (player.kind === 'album' ||
      player.kind === 'track' ||
      player.kind === 'playlist')
  ) {
    return value as Player;
  }
  if (
    hasId &&
    player.provider === 'apple' &&
    typeof player.storefront === 'string' &&
    player.storefront.length > 0 &&
    (player.kind === 'album' ||
      player.kind === 'song' ||
      player.kind === 'playlist') &&
    (player.track === undefined || typeof player.track === 'string')
  ) {
    return value as Player;
  }
  throw new Error('保存されたプレイヤー情報の形式が正しくありません。');
}
