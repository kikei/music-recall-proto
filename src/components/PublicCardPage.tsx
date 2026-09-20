import { useEffect, useState } from 'react';
import { getPublicCard, type Card, type PublicCard } from '../api/cards.js';
import { CardView } from './CardView.js';
import { PlayerEmbed } from './PlayerEmbed.js';

export function PublicCardPage({
  projectSlug,
  cardId,
}: {
  projectSlug: string;
  cardId: string;
}) {
  const [card, setCard] = useState<PublicCard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setError('');
    getPublicCard(projectSlug, cardId)
      .then(next => {
        if (!cancelled) setCard(next);
      })
      .catch(e => {
        if (!cancelled) {
          setError(
            e instanceof Error && e.message === 'not found'
              ? 'カードが見つかりません。'
              : e instanceof Error
                ? e.message
                : String(e)
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectSlug, cardId]);

  return (
    <div className="app public-card-page">
      {card && (
        <header className="public-card-header">
          <a href="/">{card.projectName}</a>
        </header>
      )}
      {error && <p className="error">{error}</p>}
      {!card && !error && <p className="hint">読み込んでいます…</p>}
      {card && (
        <main className="card-page">
          <CardView card={asCard(card)} publicView />
          {card.player && <PlayerEmbed player={card.player} />}
        </main>
      )}
    </div>
  );
}

function asCard(card: PublicCard): Card {
  return {
    ...card,
    canEdit: false,
    hasTranscript: false,
    canDelete: false,
    canChangeVisibility: false,
    metadata: null,
    updated_at: card.created_at,
    recall_count: 0,
    visibility: 'public',
  };
}
