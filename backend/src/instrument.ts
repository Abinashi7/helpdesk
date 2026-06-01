import * as Sentry from '@sentry/node';
import { env } from './config/env.js';

if (env.SENTRY_DSN && env.SENTRY_ENVIRONMENT) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: env.SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1.0,
  });
}
