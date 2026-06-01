import './instrument.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { boss } from './lib/boss.js';
import { registerClassifyWorker } from './workers/classify.js';
import { registerAutoResolveWorker } from './workers/autoResolve.js';
import { registerSendEmailWorker } from './workers/sendEmail.js';

await boss.start();
await registerClassifyWorker();
await registerAutoResolveWorker();
await registerSendEmailWorker();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
