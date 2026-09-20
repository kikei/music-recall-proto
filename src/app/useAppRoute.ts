import { useEffect, useState } from 'react';
import { routeFromUrl, routePath, type AppRoute } from '../routing.js';

export type AppNavigate = (route: AppRoute, replace?: boolean) => void;

export function useAppRoute() {
  const [view, setView] = useState(() => routeFromUrl(window.location));
  const [navigationKey, setNavigationKey] = useState(0);
  const [fromRecall, setFromRecall] = useState(false);

  // A history entry is the source of truth when the browser moves backward or
  // forward. The key also makes a repeated recall at the same URL run again.
  useEffect(() => {
    const onPopState = () => {
      setView(routeFromUrl(window.location));
      setFromRecall(false);
      setNavigationKey(key => key + 1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(route: AppRoute, replace = false) {
    const path = routePath(route);
    if (replace) {
      window.history.replaceState(null, '', path);
    } else if (path !== window.location.pathname + window.location.search) {
      window.history.pushState(null, '', path);
    }
    setView(route);
    setFromRecall(false);
    setNavigationKey(key => key + 1);
  }

  return {
    view,
    navigationKey,
    fromRecall,
    setFromRecall,
    navigate,
  };
}
