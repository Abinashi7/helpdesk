import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.VITE_SENTRY_ENVIRONMENT) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: import.meta.env.VITE_SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1.0,
  });
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p className="p-8 text-sm text-destructive">Something went wrong.</p>}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
