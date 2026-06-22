import type { Card } from '../api/client.js';
import { PlayerEmbed } from './PlayerEmbed.js';

// Ambient recall rail beside the conversation. Bare related cards (no reason
// text); clicking the title opens the card.
export function RelatedRail({
  related,
  onOpen,
}: {
  related: Card[] | null;
  onOpen: (cardId: string) => void;
}) {
  return (
    <aside className="related-rail">
      <div className="rail-head">想起されているもの</div>
      {related && related.length === 0 && (
        <p className="hint">まだありません。</p>
      )}
      {related &&
        related.map(card => (
          <div key={card.id} className="rail-card">
            <button className="rail-card-title" onClick={() => onOpen(card.id)}>
              {card.title} <span className="card-artist">/ {card.artist}</span>
            </button>
            {card.player && <PlayerEmbed player={card.player} compact />}
          </div>
        ))}
    </aside>
  );
}
