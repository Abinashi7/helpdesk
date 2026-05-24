import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import './workers/classify.js';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
