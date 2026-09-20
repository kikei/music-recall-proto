import { useEffect, useRef, useState } from 'react';
import { deleteCard, editCard, getCard, type Card } from '../api/cards.js';
import { recallHit } from '../api/recall.js';
import { createSession, type Session } from '../api/sessions.js';
import { CardView } from './CardView.js';
import { CardEditForm } from './CardEditForm.js';
import { PlayerEmbed } from './PlayerEmbed.js';
import { VisibilityControl } from './VisibilityControl.js';

// Standalone card page. Increments the reference count when opened from a recall
// result. Each text field and the player URL can be edited; "recall" goes to the
// recall view. A new/continued session can be started from the impression you
// enter.
export function CardPage({
  projectSlug,
  cardId,
  fromRecall,
  onDeleted,
  onStarted,
  onRecallFromCard,
  onChanged,
}: {
  projectSlug: string;
  cardId: string;
  fromRecall: boolean;
  onDeleted: () => void;
  onStarted: (session: Session) => void;
  onRecallFromCard: (card: Card, direction: string) => void;
  // Card content changed, so lists showing it (the sidebar) should refresh.
  onChanged?: () => void;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [editing, setEditing] = useState(false);
  const [direction, setDirection] = useState('');
  const [impression, setImpression] = useState('');
  const [busy, setBusy] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [error, setError] = useState('');
  const hitDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (fromRecall && !hitDone.current) {
        hitDone.current = true;
        void recallHit(projectSlug, cardId).catch(() => {
          // Failing to bump the reference count is non-fatal, so ignore it
        });
      }
      try {
        const next = await getCard(projectSlug, cardId);
        if (!cancelled) setCard(next);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error && e.message === 'not found'
              ? 'カードが見つかりません。'
              : e instanceof Error
                ? e.message
                : String(e)
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Once per cardId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  // Correct the work this card is about, in place from the heading. Available
  // both in the card view and while the edit form is open.
  async function editField(field: 'title' | 'artist', value: string) {
    if (!card) return;
    setError('');
    try {
      setCard(await editCard(projectSlug, card.id, { [field]: value }));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e; // keep the inline input open for a retry
    }
  }

  // Save the freeform reference metadata. It does not touch the sidebar (which
  // only shows title/artist), so no onChanged here.
  async function saveMetadata(next: string) {
    if (!card) return;
    setError('');
    try {
      setCard(await editCard(projectSlug, card.id, { metadata: next }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e; // keep the metadata editor open for a retry
    }
  }

  async function remove() {
    if (!card) return;
    if (!window.confirm('このカードを削除しますか?')) return;
    setBusy(true);
    setError('');
    try {
      await deleteCard(projectSlug, card.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function start(continueFromPast: boolean) {
    if (!card) return;
    setBusy(true);
    setError('');
    try {
      const res = await createSession(
        projectSlug,
        card.title,
        card.artist,
        impression.trim(),
        continueFromPast ? { continueFromCardId: card.id } : undefined
      );
      onStarted(res.session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function setVisibility(visibility: Card['visibility']) {
    if (!card || visibility === card.visibility) return;
    setVisibilityBusy(true);
    setError('');
    try {
      setCard(await editCard(projectSlug, card.id, { visibility }));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVisibilityBusy(false);
    }
  }

  return (
    <div className="card-page">
      {error && <p className="error">{error}</p>}
      {card && editing && (
        <CardEditForm
          card={card}
          onSaved={updated => {
            setCard(updated);
            setEditing(false);
            onChanged?.();
          }}
          onCancel={() => setEditing(false)}
          onEditField={editField}
        />
      )}
      {card && !editing && (
        <>
          <CardView
            card={card}
            onEditField={card.canEdit ? editField : undefined}
            onSaveMetadata={card.canEdit ? saveMetadata : undefined}
            titleAction={
              <>
                {card.canChangeVisibility && (
                  <VisibilityControl
                    value={card.visibility}
                    disabled={visibilityBusy}
                    onChange={setVisibility}
                  />
                )}
                {card.canEdit && (
                  <button onClick={() => setEditing(true)}>編集</button>
                )}
                {card.canDelete && (
                  <button className="danger" disabled={busy} onClick={remove}>
                    削除
                  </button>
                )}
              </>
            }
            metaAction={
              <span className="recall-action">
                <input
                  className="recall-dir"
                  placeholder="追加の方向 (例: もっと開放的な感じ)"
                  value={direction}
                  onChange={e => setDirection(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onRecallFromCard(card, direction);
                  }}
                />
                <button
                  className="recall-btn"
                  onClick={() => onRecallFromCard(card, direction)}
                >
                  ↻ 想起
                </button>
              </span>
            }
          />
          {card.player && <PlayerEmbed player={card.player} />}
          <div className="reengage">
            <textarea
              placeholder="再会して深まった印象 (この内容からセッションが始まります)"
              value={impression}
              onChange={e => setImpression(e.target.value)}
            />
            <div className="reengage-actions">
              <button disabled={busy} onClick={() => start(true)}>
                {busy ? '…' : '続きのセッション'}
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => start(false)}
              >
                {busy ? '作品を調べています…' : '新しいセッション'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
