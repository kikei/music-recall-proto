import { useEffect, useState } from 'react';
import { SessionView } from './screens/SessionScreen.js';
import { StartSessionForm } from './screens/StartSessionForm.js';
import { CardsScreen } from './screens/CardsScreen.js';
import { AccountSettingsScreen } from './screens/AccountSettingsScreen.js';
import { ProjectSettingsScreen } from './screens/ProjectSettingsScreen.js';
import { RecallScreen } from './screens/RecallScreen.js';
import { CardPage } from './components/CardPage.js';
import { Sidebar } from './components/Sidebar.js';
import { NavLink } from './components/NavLink.js';
import { routeFromUrl } from './routing.js';
import { getAccount } from './api/account.js';
import { listCards, type Card } from './api/cards.js';
import type { Project } from './api/projects.js';
import {
  deleteSession,
  listActiveSessions,
  type Session,
} from './api/sessions.js';
import { PublicCardPage } from './components/PublicCardPage.js';
import { useAppRoute } from './app/useAppRoute.js';
import { useProjects } from './app/useProjects.js';
import { AppNavigationProvider } from './app/AppNavigationContext.js';

// How many recent cards the sidebar shows.
const RECENT_CARDS = 14;

export function App() {
  const [openSessions, setOpenSessions] = useState<Session[]>([]);
  const { view, navigationKey, fromRecall, setFromRecall, navigate } =
    useAppRoute();
  const [recentCards, setRecentCards] = useState<Card[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  useProjects(navigate, setProjects, setError);
  const viewSessionId = view.kind === 'session' ? view.id : null;
  const projectSlug = 'projectSlug' in view ? view.projectSlug : null;
  const currentProject =
    projects?.find(project => project.slug === projectSlug) ?? null;

  // Restore open sessions for the sidebar without overriding a direct link.
  useEffect(() => {
    let cancelled = false;
    setOpenSessions([]);
    (async () => {
      try {
        if (!currentProject) return;
        const sessions = await listActiveSessions(currentProject.slug);
        if (!cancelled) setOpenSessions(sessions);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProject?.slug]);

  // The chosen name shown at the foot of the sidebar. Held here so renaming in
  // settings updates the sidebar without a reload.
  useEffect(() => {
    getAccount()
      .then(a => setDisplayName(a.displayName))
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Keep the sidebar's recent-cards list fresh as cards change.
  useEffect(() => {
    if (!currentProject) return;
    let cancelled = false;
    setRecentCards([]);
    listCards(currentProject.slug)
      .then(cards => {
        if (!cancelled) {
          setRecentCards(
            [...cards]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, RECENT_CARDS)
          );
        }
      })
      // An empty sidebar with no explanation reads as lost data, so say why.
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [dataVersion, currentProject?.slug]);

  function foreground(id: string) {
    if (currentProject) {
      navigate({ kind: 'session', projectSlug: currentProject.slug, id });
    }
  }

  // Clicking the brand returns to the landing view (the new-session form).
  function goHome() {
    if (currentProject) {
      navigate({ kind: 'new', projectSlug: currentProject.slug });
    }
  }

  // A new (or continued) session was started: add it and foreground it.
  function started(session: Session) {
    setOpenSessions(prev =>
      prev.some(s => s.id === session.id) ? prev : [session, ...prev]
    );
    foreground(session.id);
  }

  // A session finished: it graduates from the workspace into a card page.
  function cardCreated(card: Card) {
    setOpenSessions(prev => prev.filter(s => s.id !== viewSessionId));
    setDataVersion(v => v + 1);
    navigate(
      { kind: 'card', projectSlug: card.projectSlug, id: card.id },
      true
    );
  }

  // A session's work was corrected: keep the sidebar's copy in step.
  function sessionUpdated(session: Session) {
    setOpenSessions(prev => prev.map(s => (s.id === session.id ? session : s)));
  }

  // Discard an open session from the workspace.
  async function removeSession(id: string) {
    if (!window.confirm('このセッションを削除しますか? (元に戻せません)')) {
      return;
    }
    try {
      if (!currentProject) return;
      await deleteSession(currentProject.slug, id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    const next = openSessions.filter(s => s.id !== id);
    setOpenSessions(next);
    const current = routeFromUrl(window.location);
    if (current.kind === 'session' && current.id === id) {
      navigate(
        next[0]
          ? {
              kind: 'session',
              projectSlug: currentProject!.slug,
              id: next[0].id,
            }
          : { kind: 'new', projectSlug: currentProject!.slug },
        true
      );
    }
  }

  // Manual recall from the sidebar input.
  function runRecall(query: string) {
    const text = query.trim();
    if (!text || !currentProject) return;
    navigate({ kind: 'recall', projectSlug: currentProject.slug, query: text });
  }

  // Recall from a card's detail view. `direction` steers it (e.g. toward
  // "ジャズっぽいもの"); it is optional.
  function recallFromCard(card: Card, direction = '') {
    navigate({
      kind: 'recall',
      projectSlug: card.projectSlug,
      cardId: card.id,
      direction: direction.trim() || undefined,
    });
  }

  function openCard(id: string, fromRecall: boolean) {
    if (!currentProject) return;
    navigate({ kind: 'card', projectSlug: currentProject.slug, id });
    setFromRecall(fromRecall);
  }

  function cardDeleted() {
    setDataVersion(v => v + 1);
    if (currentProject) {
      navigate({ kind: 'cards', projectSlug: currentProject.slug }, true);
    }
  }

  function selectProject(slug: string) {
    setError('');
    setOpenSessions([]);
    setRecentCards([]);
    navigate({ kind: 'new', projectSlug: slug });
  }

  function projectChanged(next: Project) {
    setProjects(
      previous =>
        previous?.map(project =>
          project.slug === currentProject?.slug ? next : project
        ) ?? [next]
    );
    if (currentProject && next.slug !== currentProject.slug) {
      navigate({ kind: 'project-settings', projectSlug: next.slug }, true);
    }
  }

  function projectDeleted(remaining: Project[]) {
    const deletedIndex = projects?.findIndex(
      project => project.slug === currentProject?.slug
    );
    setProjects(remaining);
    const nextIndex = Math.min(
      deletedIndex === undefined || deletedIndex < 0 ? 0 : deletedIndex,
      remaining.length - 1
    );
    const next = remaining[nextIndex];
    if (next) selectProject(next.slug);
  }

  if (projects === null) {
    return <p className="hint page-status">読み込んでいます…</p>;
  }

  if (view.kind === 'root') {
    return (
      <p className={error ? 'error page-status' : 'hint page-status'}>
        {error || 'プロジェクトが見つかりません。'}
      </p>
    );
  }

  if (view.kind === 'not-found') {
    const first = projects[0];
    return (
      <div className="page-status">
        <p className="error">ページが見つかりません。</p>
        {first && (
          <NavLink
            to={{ kind: 'new', projectSlug: first.slug }}
            onNavigate={() => selectProject(first.slug)}
          >
            トップへ戻る
          </NavLink>
        )}
      </div>
    );
  }

  if (!currentProject) {
    return view.kind === 'card' ? (
      <PublicCardPage projectSlug={view.projectSlug} cardId={view.id} />
    ) : (
      <p className="error">プロジェクトが見つかりません。</p>
    );
  }

  return (
    <div className="app">
      <div className="workspace">
        <AppNavigationProvider navigate={navigate}>
          <Sidebar
            sessions={openSessions}
            activeSessionId={viewSessionId}
            activeCardId={view.kind === 'card' ? view.id : null}
            view={view.kind}
            displayName={displayName}
            projects={projects}
            currentProject={currentProject}
            recallQuery={view.kind === 'recall' ? (view.query ?? null) : null}
            recentCards={recentCards}
            onDeleteSession={removeSession}
            onRecall={runRecall}
            onSelectProject={selectProject}
            onProjectCreated={project => {
              setProjects(previous => [...(previous ?? []), project]);
              selectProject(project.slug);
            }}
          />
        </AppNavigationProvider>
        <main className="main">
          {error && <p className="error">{error}</p>}
          {view.kind === 'new' && (
            <StartSessionForm
              projectSlug={currentProject.slug}
              onStarted={started}
            />
          )}
          {view.kind === 'session' && (
            <SessionView
              key={`${currentProject.slug}:${view.id}`}
              sessionId={view.id}
              projectSlug={currentProject.slug}
              onCardCreated={cardCreated}
              onOpenCard={openCard}
              onSessionUpdated={sessionUpdated}
            />
          )}
          {view.kind === 'cards' && (
            <CardsScreen
              projectSlug={currentProject.slug}
              dataVersion={dataVersion}
              onOpenCard={openCard}
            />
          )}
          {view.kind === 'account-settings' && (
            <AccountSettingsScreen
              displayName={displayName}
              onDisplayNameChanged={setDisplayName}
              project={currentProject}
              onProjectSettings={() =>
                navigate({
                  kind: 'project-settings',
                  projectSlug: currentProject.slug,
                })
              }
            />
          )}
          {view.kind === 'project-settings' && (
            <ProjectSettingsScreen
              project={currentProject}
              canDeleteProject={projects.length > 1}
              onProjectChanged={projectChanged}
              onProjectDeleted={projectDeleted}
            />
          )}
          {view.kind === 'recall' && (
            <RecallScreen
              key={navigationKey}
              query={view.query ?? null}
              projectSlug={currentProject.slug}
              direction={view.direction ?? null}
              fromCardId={view.cardId ?? null}
              onOpenCard={openCard}
              onNew={goHome}
            />
          )}
          {view.kind === 'card' && (
            <CardPage
              key={`${view.id}:${navigationKey}`}
              cardId={view.id}
              projectSlug={currentProject.slug}
              fromRecall={fromRecall}
              onDeleted={cardDeleted}
              onStarted={started}
              onRecallFromCard={recallFromCard}
              onChanged={() => setDataVersion(v => v + 1)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
