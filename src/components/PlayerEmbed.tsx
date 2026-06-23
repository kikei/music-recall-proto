import type { Player } from '../api/client.js';

// Listening player embed. Spotify if available, otherwise YouTube/Niconico.
// `compact` is a smaller variant for recall results etc. (omits the link).
export function PlayerEmbed({
  player,
  compact = false,
}: {
  player: Player;
  compact?: boolean;
}) {
  const wrap = compact ? 'player player-compact' : 'player';

  if (player.provider === 'spotify') {
    const url = `https://open.spotify.com/${player.kind}/${player.id}`;
    const embedClass = compact
      ? 'embed embed-spotify embed-compact'
      : 'embed embed-spotify';
    return (
      <div className={wrap}>
        <div className={embedClass}>
          <iframe
            src={`https://open.spotify.com/embed/${player.kind}/${player.id}`}
            height={compact ? 152 : 352}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
        {!compact && (
          <p>
            <a href={url} target="_blank" rel="noreferrer noopener">
              Spotify で開く
            </a>
          </p>
        )}
      </div>
    );
  }

  if (player.provider === 'apple') {
    const path = `${player.storefront}/${player.kind}/_/${player.id}`;
    const query =
      player.kind === 'album' && player.track ? `?i=${player.track}` : '';
    const embedClass = compact
      ? 'embed embed-apple embed-compact'
      : 'embed embed-apple';
    const fullHeight = player.kind === 'song' ? 175 : 450;
    return (
      <div className={wrap}>
        <div className={embedClass}>
          <iframe
            src={`https://embed.music.apple.com/${path}${query}`}
            height={compact ? 175 : fullHeight}
            loading="lazy"
            allow="autoplay *; encrypted-media *; clipboard-write"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
            allowFullScreen
          />
        </div>
        {!compact && (
          <p>
            <a
              href={`https://music.apple.com/${path}${query}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Apple Music で開く
            </a>
          </p>
        )}
      </div>
    );
  }

  const embedClass = compact
    ? 'embed embed-video embed-compact'
    : 'embed embed-video';

  if (player.provider === 'niconico') {
    const url = `https://www.nicovideo.jp/watch/${player.id}`;
    return (
      <div className={wrap}>
        <div className={embedClass}>
          <iframe
            src={`https://embed.nicovideo.jp/watch/${player.id}`}
            title="ニコニコ動画"
            allowFullScreen
          />
        </div>
        {!compact && (
          <p>
            <a href={url} target="_blank" rel="noreferrer noopener">
              ニコニコ動画で開く
            </a>
          </p>
        )}
      </div>
    );
  }

  const url = `https://www.youtube.com/watch?v=${player.id}`;
  return (
    <div className={wrap}>
      <div className={embedClass}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${player.id}`}
          title="YouTube"
          allowFullScreen
        />
      </div>
      {!compact && (
        <p>
          <a href={url} target="_blank" rel="noreferrer noopener">
            YouTube で開く
          </a>
        </p>
      )}
    </div>
  );
}
