import { useState } from 'react';
import type { Session, Card } from '../api/client.js';
import { AutoTextarea } from './AutoTextarea.js';
import { AccountPanel } from '../auth/AccountPanel.js';
import { pickCueExample } from '../lib/recall-cue-examples.js';

// Left rail: the brand (home) with a + to start a session, a recall input, the
// open sessions, and recent cards ending in a link to all of them. Account
// actions sit at the foot, below the scrolling region.
export function Sidebar({
  sessions,
  recentCards,
  activeSessionId,
  activeCardId,
  view,
  displayName,
  onHome,
  onNew,
  onSelectSession,
  onDeleteSession,
  onOpenCard,
  onCards,
  onSettings,
  onRecall,
}: {
  sessions: Session[];
  recentCards: Card[];
  activeSessionId: string | null;
  activeCardId: string | null;
  view: string;
  displayName: string | null;
  onHome: () => void;
  onNew: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenCard: (id: string) => void;
  onCards: () => void;
  onSettings: () => void;
  onRecall: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [cueExample] = useState(pickCueExample);

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
        <button
          className={view === 'new' ? 'brand-new active' : 'brand-new'}
          onClick={onNew}
          title="新しいセッション"
          aria-label="新しいセッション"
        >
          +
        </button>
      </div>
      <div className="side-section side-recall">
        <AutoTextarea
          className="recall-input"
          placeholder={`例: ${cueExample}`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <button className="recall-go" onClick={submit}>
          想起する
        </button>
      </div>
      <div className="side-scroll">
        <div className="side-section">
          <div className="side-head">進行中のセッション</div>
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
        <div className="side-section">
          <div className="side-head">最新のカード</div>
          {recentCards.map(c => (
            <button
              key={c.id}
              className={
                c.id === activeCardId ? 'side-card active' : 'side-card'
              }
              onClick={() => onOpenCard(c.id)}
              title={`${c.title} / ${c.artist}`}
            >
              {c.title} <span className="side-artist">/ {c.artist}</span>
            </button>
          ))}
          <button
            className={
              view === 'cards'
                ? 'side-card side-all active'
                : 'side-card side-all'
            }
            onClick={onCards}
          >
            すべてのカード
            <svg viewBox="0 0 24 24" aria-hidden focusable="false">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
      <AccountPanel
        displayName={displayName}
        active={view === 'settings'}
        onSettings={onSettings}
      />
    </aside>
  );
}
