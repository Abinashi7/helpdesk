import express, { Router, type IRouter } from 'express';
import multer from 'multer';
import { createTicketFromEmail } from '../services/tickets.js';
import { boss } from '../lib/boss.js';
import { verifyMailgunWebhook } from '../middleware/verifyMailgunWebhook.js';

const router: IRouter = Router();

// Mailgun caps message size at 25 MB and posts inbound routes as
// application/x-www-form-urlencoded, switching to multipart/form-data when the
// message carries attachments. Both parsers are no-ops for the other's content
// type, so chaining them covers either shape.
const MAX_PAYLOAD = 25 * 1024 * 1024;
const urlencoded = express.urlencoded({ extended: true, limit: MAX_PAYLOAD });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PAYLOAD } });

function field(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

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

/**
 * Mailgun sends `message-headers` as a JSON string of [name, value] pairs, and
 * also mirrors each MIME header as its own form field. Prefer the structured
 * list and fall back to the mirrored field.
 */
function extractMessageId(body: Record<string, unknown>): string | undefined {
  const raw = field(body, 'message-headers');
  if (raw) {
    try {
      const headers = JSON.parse(raw) as unknown;
      if (Array.isArray(headers)) {
        for (const entry of headers) {
          if (
            Array.isArray(entry) &&
            typeof entry[0] === 'string' &&
            typeof entry[1] === 'string' &&
            entry[0].toLowerCase() === 'message-id'
          ) {
            return entry[1].replace(/^<|>$/g, '');
          }
        }
      }
    } catch {
      // Malformed header JSON is not worth failing the whole delivery over —
      // fall through to the mirrored field below.
    }
  }

  const mirrored = field(body, 'Message-Id') ?? field(body, 'Message-ID');
  return mirrored?.replace(/^<|>$/g, '');
}

router.post('/email', urlencoded, upload.any(), verifyMailgunWebhook, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const rawFrom = field(body, 'from');
  const subject = field(body, 'subject');
  // `stripped-text` drops the quoted thread and signature block, which keeps
  // reply emails useful for classification. Fall back to the full body.
  const emailBody = (
    field(body, 'stripped-text') ??
    field(body, 'body-plain') ??
    field(body, 'body-html') ??
    ''
  ).trim();

  if (!rawFrom || !subject || !emailBody) {
    res.status(400).json({ error: 'Missing required email fields' });
    return;
  }

  const { fromEmail, fromName } = parseFrom(rawFrom);
  const messageId = extractMessageId(body);

  const ticket = await createTicketFromEmail({
    subject: subject.slice(0, 500),
    body: emailBody.slice(0, 100_000),
    fromEmail: fromEmail.slice(0, 255),
    fromName: fromName.slice(0, 100),
    messageId,
  });

  boss.send('auto-resolve', { ticket });

  res.json({ ok: true, ticketId: ticket.id });
});

export default router;
