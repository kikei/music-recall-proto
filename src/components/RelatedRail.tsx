import type { Card, Player } from '../api/client.js';
import { PlayerEmbed } from './PlayerEmbed.js';

// Ambient recall rail beside the conversation. The session's own player sits at
// the top; below it are bare related cards (no reason text); clicking the title
// opens the card.
export function RelatedRail({
  related,
  sessionPlayer,
  onOpen,
}: {
  related: Card[] | null;
  sessionPlayer: Player | null;
  onOpen: (card: Card) => void;
}) {
  return (
    <aside className="related-rail">
      {sessionPlayer && (
        <div className="rail-player">
          <PlayerEmbed player={sessionPlayer} compact />
        </div>
      )}
      <div className="rail-head">想起されているもの</div>
      {related && related.length === 0 && (
        <p className="hint">まだありません。</p>
      )}
      {related &&
        related.map(card => (
          <div key={card.id} className="rail-card">
            <button className="rail-card-title" onClick={() => onOpen(card)}>
              {card.title} <span className="card-artist">/ {card.artist}</span>
            </button>
            {card.player && <PlayerEmbed player={card.player} compact />}
          </div>
        ))}
    </aside>
  );
}
