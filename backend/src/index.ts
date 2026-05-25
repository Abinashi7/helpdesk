import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { boss } from './lib/boss.js';
import { registerClassifyWorker } from './workers/classify.js';
import { registerAutoResolveWorker } from './workers/autoResolve.js';

await boss.start();
await registerClassifyWorker();
await registerAutoResolveWorker();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
