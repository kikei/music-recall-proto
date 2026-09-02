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

// The SDK only requests discovery once it mounts and runs its effects; the
// tenant origin is already known here from the build-time env, so start its
// TLS handshake now instead of leaving it to queue behind that.
if (isAuthConfigured) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = new URL(logtoConfig.endpoint).origin;
  document.head.appendChild(link);
}

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
