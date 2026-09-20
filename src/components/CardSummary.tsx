import type { Card } from '../api/cards.js';
import { formatDate } from '../format/datetime.js';
import { NavLink } from './NavLink.js';

// Clickable summary for the card list. Click to open the detail.
export function CardSummary({
  card,
  onOpen,
}: {
  card: Card;
  onOpen: () => void;
}) {
  return (
    <NavLink
      className="card-summary"
      to={{ kind: 'card', projectSlug: card.projectSlug, id: card.id }}
      onNavigate={onOpen}
    >
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
    </NavLink>
  );
}
