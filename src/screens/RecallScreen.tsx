import { useEffect, useState } from 'react';
import { recall, recallFromCard, type RecallResult } from '../api/client.js';
import { RecallResultList } from '../components/RecallResultList.js';

export interface RecallFromCardRequest {
  cardId: string;
  title: string;
  artist: string;
}

// Recall results view. The cue is entered in the sidebar; this only runs the
// search and shows the outcome. App remounts it (via a nonce key) per request.
export function RecallScreen({
  query,
  direction,
  fromCard,
  onOpenCard,
}: {
  query: string | null;
  direction: string | null;
  fromCard: RecallFromCardRequest | null;
  onOpenCard: (cardId: string, fromRecall: boolean) => void;
}) {
  const [results, setResults] = useState<RecallResult[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const source = fromCard ? `${fromCard.title} / ${fromCard.artist}` : query;

  useEffect(() => {
    const job = fromCard
      ? recallFromCard(fromCard.cardId, direction ?? undefined)
      : recall(query ?? '');
    job
      .then(setResults)
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
    // Runs once; App remounts this view per request via a nonce key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="recall">
      {source && (
        <p className="recall-source">
          「{source}」からの想起
          {direction && <span> (方向: {direction})</span>}
        </p>
      )}
      {busy && <p className="hint">想起中…</p>}
      {error && <p className="error">{error}</p>}
      {results && results.length === 0 && (
        <p className="hint">浮上したカードはありませんでした。</p>
      )}
      {results && results.length > 0 && (
        <RecallResultList
          results={results}
          onOpen={id => onOpenCard(id, true)}
        />
      )}
    </section>
  );
}
