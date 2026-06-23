// Embed info for the listening player. The id shape differs per provider.
// Apple Music carries the storefront (e.g. jp, us) and, for a track inside an
// album page, the track id from the `i` query parameter.
export type Player =
  | { provider: 'spotify'; kind: 'album' | 'track' | 'playlist'; id: string }
  | { provider: 'youtube'; id: string }
  | { provider: 'niconico'; id: string }
  | {
      provider: 'apple';
      storefront: string;
      kind: 'album' | 'song' | 'playlist';
      id: string;
      track?: string;
    };
