import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AppNavigate } from './useAppRoute.js';

const AppNavigationContext = createContext<AppNavigate | null>(null);

export function AppNavigationProvider({
  navigate,
  children,
}: {
  navigate: AppNavigate;
  children: ReactNode;
}) {
  return (
    <AppNavigationContext.Provider value={navigate}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigation() {
  return useContext(AppNavigationContext);
}
