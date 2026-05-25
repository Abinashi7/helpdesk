import { PgBoss } from 'pg-boss';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const boss = new PgBoss(env.DATABASE_URL);

boss.on('error', (err) => logger.error(err, 'pg-boss error'));
