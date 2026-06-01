import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';
import { logger } from './logger.js';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) {
    logger.warn('sendEmail: SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not configured, skipping');
    return;
  }

  await sgMail.send({
    to,
    from: env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    ...(html && { html }),
  });
}
