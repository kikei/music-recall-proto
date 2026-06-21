import { useEffect, useRef, useState } from 'react';
import {
  getCard,
  recallHit,
  createSession,
  deleteCard,
  type Card,
  type Session,
  type ChatMessage,
} from '../api/client.js';
import { CardView } from './CardView.js';
import { CardEditForm } from './CardEditForm.js';
import { PlayerEmbed } from './PlayerEmbed.js';

// Card detail (modal). Increments the reference count when opened from a
// recall result. Each text field and the player URL can be edited; "recall"
// navigates to the recall screen. A new/continued session can be started from
// the impression you enter.
export function CardDetail({
  cardId,
  fromRecall,
  onClose,
  onStarted,
  onRecallFromCard,
}: {
  cardId: string;
  fromRecall: boolean;
  onClose: () => void;
  onStarted: (session: Session, messages: ChatMessage[]) => void;
  onRecallFromCard: (card: Card) => void;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [editing, setEditing] = useState(false);
  const [impression, setImpression] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hitDone = useRef(false);

  useEffect(() => {
    (async () => {
      if (fromRecall && !hitDone.current) {
        hitDone.current = true;
        try {
          await recallHit(cardId);
        } catch {
          // Failing to bump the reference count is non-fatal, so ignore it
        }
      }
      try {
        setCard(await getCard(cardId));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    // Once per cardId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  async function remove() {
    if (!card) return;
    if (!window.confirm('このカードを削除しますか? (元に戻せません)')) return;
    setBusy(true);
    setError('');
    try {
      await deleteCard(card.id);
      onClose();
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
        card.title,
        card.artist,
        impression.trim(),
        continueFromPast ? { continueFromCardId: card.id } : undefined
      );
      onStarted(res.session, res.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-bar">
          <button onClick={onClose}>← 閉じる</button>
          {card && !editing && (
            <span className="modal-bar-actions">
              <button onClick={() => setEditing(true)}>編集</button>
              <button className="danger" disabled={busy} onClick={remove}>
                削除
              </button>
            </span>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        {card && editing && (
          <CardEditForm
            card={card}
            onSaved={updated => {
              setCard(updated);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        )}
        {card && !editing && (
          <>
            <CardView
              card={card}
              metaAction={
                <button
                  className="recall-btn"
                  onClick={() => onRecallFromCard(card)}
                >
                  ↻ 想起
                </button>
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
    </div>
  );
}
