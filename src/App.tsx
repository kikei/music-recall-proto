import { useCallback, useEffect, useState } from 'react';
import { SessionView } from './screens/SessionScreen.js';
import { StartSessionForm } from './screens/StartSessionForm.js';
import { CardsScreen } from './screens/CardsScreen.js';
import {
  RecallScreen,
  type RecallFromCardRequest,
} from './screens/RecallScreen.js';
import { CardPage } from './components/CardPage.js';
import { Sidebar } from './components/Sidebar.js';
import {
  listActiveSessions,
  deleteSession,
  type Session,
  type Card,
} from './api/client.js';

// What the main area shows. Sessions persist in the sidebar; the main area
// foregrounds one of them or a standalone view (new, cards, recall, a card).
type MainView =
  | { kind: 'session' }
  | { kind: 'new' }
  | { kind: 'cards' }
  | { kind: 'recall'; from?: RecallFromCardRequest }
  | { kind: 'card'; id: string; fromRecall: boolean };

export function App() {
  const [openSessions, setOpenSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [view, setView] = useState<MainView>({ kind: 'session' });
  const [returnView, setReturnView] = useState<MainView>({ kind: 'cards' });
  const [dataVersion, setDataVersion] = useState(0);
  const [error, setError] = useState('');

  // Restore the open sessions on load and foreground the first one.
  useEffect(() => {
    (async () => {
      try {
        const list = await listActiveSessions();
        setOpenSessions(list);
        if (list.length > 0) {
          setActiveSessionId(list[0].id);
          setView({ kind: 'session' });
        } else {
          setView({ kind: 'new' });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  function foreground(id: string) {
    setActiveSessionId(id);
    setView({ kind: 'session' });
  }

  // A new (or continued) session was started: add it and foreground it.
  function started(session: Session) {
    setOpenSessions(prev =>
      prev.some(s => s.id === session.id) ? prev : [...prev, session]
    );
    setActiveSessionId(session.id);
    setView({ kind: 'session' });
  }

  // A session finished: it graduates from the workspace into a card page.
  function cardCreated(card: Card) {
    const next = openSessions.filter(s => s.id !== activeSessionId);
    setOpenSessions(next);
    setActiveSessionId(next[0]?.id ?? null);
    setDataVersion(v => v + 1);
    setView({ kind: 'card', id: card.id, fromRecall: false });
  }

  // Discard an open session from the workspace.
  async function removeSession(id: string) {
    if (!window.confirm('このセッションを削除しますか? (元に戻せません)')) {
      return;
    }
    try {
      await deleteSession(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    const next = openSessions.filter(s => s.id !== id);
    setOpenSessions(next);
    if (activeSessionId === id) setActiveSessionId(next[0]?.id ?? null);
  }

  function openCard(id: string, fromRecall: boolean) {
    setReturnView(view);
    setView({ kind: 'card', id, fromRecall });
  }

  function closeCard() {
    setDataVersion(v => v + 1);
    setView(returnView);
  }

  const consumeRecallFrom = useCallback(
    () => setView(v => (v.kind === 'recall' ? { kind: 'recall' } : v)),
    []
  );

  return (
    <div className="app">
      <div className="workspace">
        <Sidebar
          sessions={openSessions}
          activeSessionId={view.kind === 'session' ? activeSessionId : null}
          view={view.kind}
          onSelectSession={foreground}
          onDeleteSession={removeSession}
          onNew={() => setView({ kind: 'new' })}
          onCards={() => setView({ kind: 'cards' })}
          onRecall={() => setView({ kind: 'recall' })}
        />
        <main className="main">
          {error && <p className="error">{error}</p>}
          {(view.kind === 'new' ||
            (view.kind === 'session' && !activeSessionId)) && (
            <StartSessionForm onStarted={started} />
          )}
          {view.kind === 'session' && activeSessionId && (
            <SessionView
              key={activeSessionId}
              sessionId={activeSessionId}
              onCardCreated={cardCreated}
              onOpenCard={openCard}
            />
          )}
          {view.kind === 'cards' && (
            <CardsScreen dataVersion={dataVersion} onOpenCard={openCard} />
          )}
          {view.kind === 'recall' && (
            <RecallScreen
              onOpenCard={openCard}
              fromCard={view.from ?? null}
              onFromCardConsumed={consumeRecallFrom}
            />
          )}
          {view.kind === 'card' && (
            <CardPage
              cardId={view.id}
              fromRecall={view.fromRecall}
              onClose={closeCard}
              onStarted={started}
              onRecallFromCard={card =>
                setView({
                  kind: 'recall',
                  from: {
                    cardId: card.id,
                    title: card.title,
                    artist: card.artist,
                  },
                })
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
