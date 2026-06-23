import { useState } from 'react';
import {
  getCardTranscript,
  type Card,
  type ChatMessage,
} from '../api/client.js';
import { RichText } from './RichText.js';
import { formatDateTime } from '../format/datetime.js';

// Show the reunion card's four parts (target, hook, recall phrase, background).
export function CardView({
  card,
  metaAction,
  children,
}: {
  card: Card;
  metaAction?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <article className="card">
      <h3 className="card-target">
        {card.title} <span className="card-artist">/ {card.artist}</span>
        {card.album ? (
          <span className="card-album"> ({card.album})</span>
        ) : null}
      </h3>
      <dl className="card-fields">
        <dt>引っかかり</dt>
        <dd>{card.hook}</dd>
        <dt>想起フレーズ</dt>
        <dd className="recall-phrase">{card.recall_phrase}</dd>
        <dt>背景</dt>
        <dd>{card.background}</dd>
      </dl>
      <div className="card-meta">
        <span>登録 {formatDateTime(card.created_at)}</span>
        <span>想起から {card.recall_count} 回参照</span>
        {metaAction && <span className="meta-action">{metaAction}</span>}
      </div>
      {card.session_id && <Transcript key={card.id} cardId={card.id} />}
      {children}
    </article>
  );
}

// The source session's conversation. View-only, lazily fetched when opened.
function Transcript({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState('');

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && messages === null) {
      try {
        setMessages(await getCardTranscript(cardId));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  }

  return (
    <div className="transcript">
      <button className="transcript-toggle" onClick={toggle}>
        {open ? '▾ セッションの記録' : '▸ セッションの記録'}
      </button>
      {open && error && <p className="error">{error}</p>}
      {open && messages && messages.length === 0 && (
        <p className="hint">記録がありません。</p>
      )}
      {open && messages && messages.length > 0 && (
        <div className="chat-log">
          {messages.map(m => (
            <div key={m.id} className={`bubble ${m.role}`}>
              {m.role === 'assistant' ? (
                <RichText text={m.content} />
              ) : (
                m.content
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
