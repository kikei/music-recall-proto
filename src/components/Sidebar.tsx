import { useState } from 'react';
import type { Session, Card } from '../api/client.js';
import { AutoTextarea } from './AutoTextarea.js';

// Left rail: a recall input, recent cards, and the open sessions (chat-UI
// style). The title returns to the landing view.
export function Sidebar({
  sessions,
  recentCards,
  activeSessionId,
  view,
  onHome,
  onSelectSession,
  onDeleteSession,
  onOpenCard,
  onNew,
  onCards,
  onRecall,
}: {
  sessions: Session[];
  recentCards: Card[];
  activeSessionId: string | null;
  view: string;
  onHome: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenCard: (id: string) => void;
  onNew: () => void;
  onCards: () => void;
  onRecall: (query: string) => void;
}) {
  const [query, setQuery] = useState('');

  function submit() {
    if (!query.trim()) return;
    onRecall(query);
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <button className="brand-home" onClick={onHome}>
          音楽想起エンジン
        </button>
      </div>
      <div className="side-section side-recall">
        <AutoTextarea
          className="recall-input"
          placeholder="今のきっかけ (例: 反復から行進感に変わる録音)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <button className="recall-go" disabled={!query.trim()} onClick={submit}>
          想起する
        </button>
      </div>
      <div className="side-section">
        <div className="side-head">最新のカード</div>
        {recentCards.map(c => (
          <button
            key={c.id}
            className="side-card"
            onClick={() => onOpenCard(c.id)}
            title={`${c.title} / ${c.artist}`}
          >
            {c.title} <span className="side-artist">/ {c.artist}</span>
          </button>
        ))}
        <button
          className={view === 'cards' ? 'side-more active' : 'side-more'}
          onClick={onCards}
        >
          カード一覧 →
        </button>
      </div>
      <div className="side-section">
        <div className="side-head">進行中のセッション</div>
        <button
          className={view === 'new' ? 'side-item add active' : 'side-item add'}
          onClick={onNew}
        >
          ＋ 新しいセッション
        </button>
        {sessions.map(s => (
          <div
            key={s.id}
            className={
              view === 'session' && s.id === activeSessionId
                ? 'side-item session active'
                : 'side-item session'
            }
          >
            <button
              className="side-item-main"
              onClick={() => onSelectSession(s.id)}
              title={`${s.title} / ${s.artist}`}
            >
              {s.title} <span className="side-artist">/ {s.artist}</span>
            </button>
            <button
              className="side-item-del"
              onClick={() => onDeleteSession(s.id)}
              title="このセッションを削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
