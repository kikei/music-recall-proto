import { useEffect, useState } from 'react';
import { listCards, type Card } from '../api/cards.js';
import { CardSummary } from '../components/CardSummary.js';

export function CardsScreen({
  projectSlug,
  dataVersion,
  onOpenCard,
}: {
  projectSlug: string;
  dataVersion: number;
  onOpenCard: (cardId: string, fromRecall: boolean) => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCards([]);
    setError('');
    (async () => {
      try {
        const next = await listCards(projectSlug);
        if (!cancelled) setCards(next);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataVersion, projectSlug]);

  if (error) return <p className="error">{error}</p>;
  if (cards.length === 0) {
    return (
      <p className="hint">
        まだ再会カードがありません。聴取セッションから作ってください。
      </p>
    );
  }

  return (
    <section className="card-list">
      {cards.map(card => (
        <CardSummary
          key={card.id}
          card={card}
          onOpen={() => onOpenCard(card.id, false)}
        />
      ))}
    </section>
  );
}
