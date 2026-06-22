import type { Session } from '../api/client.js';

// Left rail: open sessions (chat-UI style) plus entries for starting a new
// session, the cards list, and manual recall.
export function Sidebar({
  sessions,
  activeSessionId,
  view,
  onSelectSession,
  onNew,
  onCards,
  onRecall,
}: {
  sessions: Session[];
  activeSessionId: string | null;
  view: string;
  onSelectSession: (id: string) => void;
  onNew: () => void;
  onCards: () => void;
  onRecall: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>音楽想起エンジン</h1>
        <p className="tagline">音楽を保存せず、再会を予約する。</p>
      </div>
      <div className="side-section">
        <div className="side-head">セッション</div>
        {sessions.map(s => (
          <button
            key={s.id}
            className={
              view === 'session' && s.id === activeSessionId
                ? 'side-item active'
                : 'side-item'
            }
            onClick={() => onSelectSession(s.id)}
          >
            <span className="side-item-title">{s.title}</span>
            <span className="side-item-sub">{s.artist}</span>
          </button>
        ))}
        <button
          className={view === 'new' ? 'side-item add active' : 'side-item add'}
          onClick={onNew}
        >
          ＋ 新しいセッション
        </button>
      </div>
      <nav className="side-section">
        <button
          className={view === 'cards' ? 'side-item active' : 'side-item'}
          onClick={onCards}
        >
          カード一覧
        </button>
        <button
          className={view === 'recall' ? 'side-item active' : 'side-item'}
          onClick={onRecall}
        >
          想起
        </button>
      </nav>
    </aside>
  );
}
