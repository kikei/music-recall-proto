import { useCallback, useState } from 'react';
import { SessionScreen } from './screens/SessionScreen.js';
import { CardsScreen } from './screens/CardsScreen.js';
import {
  RecallScreen,
  type RecallFromCardRequest,
} from './screens/RecallScreen.js';
import { CardDetail } from './components/CardDetail.js';
import type { Session, ChatMessage, Card } from './api/client.js';

type Tab = 'session' | 'recall' | 'cards';

interface Started {
  session: Session;
  messages: ChatMessage[];
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'session', label: '聴取セッション' },
  { key: 'recall', label: '想起' },
  { key: 'cards', label: 'カード一覧' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('session');
  const [open, setOpen] = useState<{ id: string; fromRecall: boolean } | null>(
    null
  );
  const [dataVersion, setDataVersion] = useState(0);
  const [started, setStarted] = useState<Started | null>(null);
  const [recallFrom, setRecallFrom] = useState<RecallFromCardRequest | null>(
    null
  );

  function openCard(id: string, fromRecall: boolean) {
    setOpen({ id, fromRecall });
  }

  function closeCard() {
    setOpen(null);
    // The detail may have changed the reference count, so reload the list.
    setDataVersion(v => v + 1);
  }

  // When a session is started from the detail view, hand it to the session tab.
  function startedFromDetail(session: Session, messages: ChatMessage[]) {
    setStarted({ session, messages });
    setOpen(null);
    setDataVersion(v => v + 1);
    setTab('session');
  }

  const consumeStarted = useCallback(() => setStarted(null), []);

  // Detail's "recall" -> go to the recall tab and recall from that card.
  function recallFromDetail(card: Card) {
    setRecallFrom({ cardId: card.id, title: card.title, artist: card.artist });
    setOpen(null);
    setDataVersion(v => v + 1);
    setTab('recall');
  }

  const consumeRecallFrom = useCallback(() => setRecallFrom(null), []);

  return (
    <div className="app">
      <header className="header">
        <h1>音楽想起エンジン</h1>
        <p className="tagline">音楽を保存せず、再会を予約する。</p>
      </header>
      <nav className="tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? 'tab active' : 'tab'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="main">
        <div hidden={tab !== 'session'}>
          <SessionScreen
            started={started}
            onStartedConsumed={consumeStarted}
            onOpenCard={openCard}
          />
        </div>
        {tab === 'recall' && (
          <RecallScreen
            onOpenCard={openCard}
            fromCard={recallFrom}
            onFromCardConsumed={consumeRecallFrom}
          />
        )}
        {tab === 'cards' && (
          <CardsScreen dataVersion={dataVersion} onOpenCard={openCard} />
        )}
      </main>
      {open && (
        <CardDetail
          cardId={open.id}
          fromRecall={open.fromRecall}
          onClose={closeCard}
          onStarted={startedFromDetail}
          onRecallFromCard={recallFromDetail}
        />
      )}
    </div>
  );
}
