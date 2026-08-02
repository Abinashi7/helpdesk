import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// mailgun.js v13 does not re-export IMailgunClient from a stable subpath, so
// derive the client type from the SDK's own signature.
type MailgunClient = ReturnType<Mailgun['client']>;

let client: MailgunClient | undefined;

function getClient(): MailgunClient | undefined {
  if (!env.MAILGUN_API_KEY) return undefined;
  if (!client) {
    client = new Mailgun(FormData).client({
      username: 'api',
      key: env.MAILGUN_API_KEY,
      url: env.MAILGUN_API_URL,
    });
  }
  return client;
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
  const mg = getClient();

  if (!mg || !env.MAILGUN_DOMAIN || !env.MAILGUN_FROM_EMAIL) {
    logger.warn(
      'sendEmail: MAILGUN_API_KEY, MAILGUN_DOMAIN or MAILGUN_FROM_EMAIL not configured, skipping',
    );
    return;
  }

  await mg.messages.create(env.MAILGUN_DOMAIN, {
    to,
    from: env.MAILGUN_FROM_EMAIL,
    subject,
    text,
    ...(html && { html }),
  });
}
