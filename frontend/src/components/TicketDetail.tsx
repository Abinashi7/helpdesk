import DOMPurify from 'dompurify';
import { type Ticket } from '@helpdesk/core';

interface Props {
  ticket: Ticket;
}

export default function TicketDetail({ ticket }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{ticket.subject}</h1>

      <div className="mt-4 text-sm text-muted-foreground space-y-1">
        <div>
          <span className="font-medium text-foreground">From:</span>{' '}
          {ticket.fromName} &lt;{ticket.fromEmail}&gt;
        </div>
        <div>
          <span className="font-medium text-foreground">Received:</span>{' '}
          {new Date(ticket.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      <div
        className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.body) }}
      />
    </div>
  );
}
