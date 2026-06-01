import { boss } from '../lib/boss.js';
import { sendEmail } from '../lib/mailer.js';
import { logger } from '../lib/logger.js';

export interface SendEmailJob {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function registerSendEmailWorker() {
  await boss.createQueue('send-email');
  await boss.work<SendEmailJob>('send-email', async ([job]) => {
    const { to, subject, text, html } = job.data;
    await sendEmail({ to, subject, text, html });
    logger.info({ to, subject }, 'send-email: sent');
  });
}
