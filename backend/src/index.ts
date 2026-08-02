import './instrument.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { boss } from './lib/boss.js';
import { registerClassifyWorker } from './workers/classify.js';
import { registerAutoResolveWorker } from './workers/autoResolve.js';
import { registerSendEmailWorker } from './workers/sendEmail.js';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Start background workers after the HTTP server is listening. This keeps the
// /api/health endpoint responsive even if a worker (or its DB/Redis connection)
// fails to start — a boot-time worker error must not fail the deploy healthcheck.
try {
  await boss.start();
  await registerClassifyWorker();
  await registerAutoResolveWorker();
  await registerSendEmailWorker();
  logger.info('Background workers started');
} catch (err) {
  logger.error(err, 'Failed to start background workers');
}
