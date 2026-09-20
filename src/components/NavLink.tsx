import type { ComponentProps, MouseEvent } from 'react';
import { routePath, type AppRoute } from '../routing.js';
import { useAppNavigation } from '../app/AppNavigationContext.js';

// Use a real link for navigation. Modified clicks and new-tab actions retain
// browser behavior; an ordinary click updates the SPA without a full reload.
export function NavLink({
  to,
  onNavigate,
  onBeforeNavigate,
  ...props
}: Omit<ComponentProps<'a'>, 'href' | 'onClick'> & {
  to: AppRoute;
  onNavigate?: () => void;
  onBeforeNavigate?: () => void;
}) {
  const navigate = useAppNavigation();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (props.target && props.target !== '_self') ||
      props.download
    ) {
      return;
    }
    event.preventDefault();
    onBeforeNavigate?.();
    if (onNavigate) onNavigate();
    else navigate?.(to);
  }

  return <a {...props} href={routePath(to)} onClick={handleClick} />;
}
