import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LogtoProvider } from '@logto/react';
import { App } from './App.js';
import { AuthGate } from './auth/AuthGate.js';
import { AuthSetupNotice } from './auth/AuthSetupNotice.js';
import {
  isAuthConfigured,
  logtoConfig,
  missingAuthEnv,
} from './auth/logto-config.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isAuthConfigured ? (
        <LogtoProvider config={logtoConfig}>
          <AuthGate>
            <App />
          </AuthGate>
        </LogtoProvider>
      ) : (
        <AuthSetupNotice missing={missingAuthEnv} />
      )}
    </ErrorBoundary>
  </StrictMode>
);
