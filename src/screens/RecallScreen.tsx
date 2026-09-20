import { useEffect, useState } from 'react';
import { getCard } from '../api/cards.js';
import { recall, recallFromCard, type RecallResult } from '../api/recall.js';
import { RecallResultList } from '../components/RecallResultList.js';
import { NavLink } from '../components/NavLink.js';

// Recall results view. The cue is entered in the sidebar; this only runs the
// search and shows the outcome. App remounts it (via a nonce key) per request.
export function RecallScreen({
  projectSlug,
  query,
  direction,
  fromCardId,
  onOpenCard,
  onNew,
}: {
  projectSlug: string;
  query: string | null;
  direction: string | null;
  fromCardId: string | null;
  onOpenCard: (cardId: string, fromRecall: boolean) => void;
  onNew: () => void;
}) {
  const [results, setResults] = useState<RecallResult[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState<string | null>(query);

  useEffect(() => {
    if (fromCardId) {
      getCard(projectSlug, fromCardId)
        .then(card => setSource(`${card.title} / ${card.artist}`))
        .catch(e => setError(e instanceof Error ? e.message : String(e)));
    }
    if (!fromCardId && !query) {
      setBusy(false);
      return;
    }
    const job = fromCardId
      ? recallFromCard(projectSlug, fromCardId, direction ?? undefined)
      : recall(projectSlug, query!);
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
      {!source && !fromCardId && (
        <p className="hint">左の欄に想起の手がかりを入力してください。</p>
      )}
      {busy && <p className="hint">想起中…</p>}
      {error && <p className="error">{error}</p>}
      {results && results.length === 0 && (
        <div className="recall-empty">
          <p className="hint">
            セッションで聴いた音楽が、想起の手がかりになります。
          </p>
          <NavLink
            className="rail-detail-link"
            to={{ kind: 'new', projectSlug }}
            onNavigate={onNew}
          >
            セッションを始める
          </NavLink>
        </div>
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
