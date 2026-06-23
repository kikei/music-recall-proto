import type { RecallResult } from '../api/client.js';
import { PlayerEmbed } from './PlayerEmbed.js';

// List of recall results. Click to open that card.
// Show a minimal set (why recalled + target) and the full player, matching
// the reunion card detail view.
export function RecallResultList({
  results,
  onOpen,
}: {
  results: RecallResult[];
  onOpen: (cardId: string) => void;
}) {
  return (
    <div className="recall-results">
      {results.map(r => (
        <article
          key={r.id}
          className="card recalled clickable"
          onClick={() => onOpen(r.id)}
        >
          <p className="reason">{r.reason}</p>
          <h3 className="card-target">
            {r.title} <span className="card-artist">/ {r.artist}</span>
          </h3>
          {r.player && (
            <div onClick={e => e.stopPropagation()}>
              <PlayerEmbed player={r.player} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
