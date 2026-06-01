import { Router, type IRouter } from 'express';
import multer from 'multer';
import Parse from '@sendgrid/inbound-mail-parser';
import { createTicketFromEmail } from '../services/tickets.js';
import { boss } from '../lib/boss.js';
import { requireWebhookSecret } from '../middleware/requireWebhookSecret.js';

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseFrom(from: string): { fromEmail: string; fromName: string } {
  const match = from.match(/^(.*?)\s*<(.+?)>\s*$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    const email = match[2].trim();
    return { fromEmail: email, fromName: name || email };
  }
  const email = from.trim();
  return { fromEmail: email, fromName: email };
}

function extractMessageId(headers: string): string | undefined {
  const match = headers.match(/^Message-ID:\s*<(.+?)>/im);
  return match?.[1];
}

router.post('/email', requireWebhookSecret, upload.any(), async (req, res) => {
  const parser = new Parse(
    { keys: ['from', 'subject', 'text', 'html', 'headers'] },
    { body: req.body, files: (req.files as Express.Multer.File[]) ?? [] },
  );

  const fields = parser.keyValues();
  const rawFrom: string = fields.from ?? '';
  const subject: string = fields.subject ?? '';
  const body: string = (fields.text ?? fields.html ?? '').trim();

  if (!rawFrom || !subject || !body) {
    res.status(400).json({ error: 'Missing required email fields' });
    return;
  }

  const { fromEmail, fromName } = parseFrom(rawFrom);
  const messageId = fields.headers ? extractMessageId(fields.headers) : undefined;

  const ticket = await createTicketFromEmail({
    subject: subject.slice(0, 500),
    body: body.slice(0, 100_000),
    fromEmail: fromEmail.slice(0, 255),
    fromName: fromName.slice(0, 100),
    messageId,
  });

  if (!ticket.category) {
    boss.send('classify', { ticket });
  }
  boss.send('auto-resolve', { ticket });

  res.json({ ok: true, ticketId: ticket.id });
});

export default router;
