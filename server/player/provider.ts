// Embed info for the listening player. The id shape differs per provider.
export type Player =
  | { provider: 'spotify'; kind: 'album' | 'track' | 'playlist'; id: string }
  | { provider: 'youtube'; id: string }
  | { provider: 'niconico'; id: string };
