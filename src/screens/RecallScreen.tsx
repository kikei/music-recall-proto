import { useEffect, useRef, useState } from 'react';
import { recall, recallFromCard, type RecallResult } from '../api/client.js';
import { RecallResultList } from '../components/RecallResultList.js';

export interface RecallFromCardRequest {
  cardId: string;
  title: string;
  artist: string;
}

export function RecallScreen({
  onOpenCard,
  fromCard,
  onFromCardConsumed,
}: {
  onOpenCard: (cardId: string, fromRecall: boolean) => void;
  fromCard: RecallFromCardRequest | null;
  onFromCardConsumed: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecallResult[] | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handled = useRef<RecallFromCardRequest | null>(null);

  async function run() {
    if (!query.trim()) return;
    setBusy(true);
    setError('');
    setSource(null);
    try {
      setResults(await recall(query.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // When arriving from a card detail's "recall", recall from that card.
  useEffect(() => {
    if (!fromCard || handled.current === fromCard) return;
    handled.current = fromCard;
    onFromCardConsumed();
    setQuery('');
    setSource(`${fromCard.title} / ${fromCard.artist}`);
    setBusy(true);
    setError('');
    setResults(null);
    recallFromCard(fromCard.cardId)
      .then(setResults)
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  }, [fromCard, onFromCardConsumed]);

  return (
    <section className="recall">
      <p className="lead">
        今のきっかけを入れてください。今聴いている曲の印象でも、
        「何か前に聴いた感じがする」でも。
      </p>
      <textarea
        placeholder="例: 反復から行進感に変わっていくフィールド録音"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <button
        className="primary"
        disabled={busy || !query.trim()}
        onClick={run}
      >
        {busy ? '想起中…' : '想起する'}
      </button>
      {source && <p className="recall-source">「{source}」からの想起</p>}
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
