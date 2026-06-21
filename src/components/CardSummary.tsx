import type { Card } from '../api/client.js';
import { formatDate } from '../format/datetime.js';

// Clickable summary for the card list. Click to open the detail.
export function CardSummary({
  card,
  onOpen,
}: {
  card: Card;
  onOpen: () => void;
}) {
  return (
    <button className="card-summary" onClick={onOpen}>
      <span className="card-target">
        {card.title} <span className="card-artist">/ {card.artist}</span>
        <span className="card-date">（{formatDate(card.created_at)}）</span>
      </span>
      {card.recall_phrase && (
        <span className="recall-phrase">{card.recall_phrase}</span>
      )}
      <span className="card-meta">
        <span>想起から {card.recall_count} 回参照</span>
      </span>
    </button>
  );
}
