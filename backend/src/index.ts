import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { boss } from './lib/boss.js';
import { registerClassifyWorker } from './workers/classify.js';

await boss.start();
await registerClassifyWorker();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
