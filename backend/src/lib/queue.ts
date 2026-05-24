import { Queue } from 'bullmq';
import { env } from '../config/env.js';

const url = new URL(env.REDIS_URL);
export const connection = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
};

export const classifyQueue = new Queue('classify', { connection });
