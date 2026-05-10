import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { type Ticket } from '@helpdesk/core';
import { apiFetch } from '@/lib/api';

export interface Reply {
  id: number;
  body: string;
  bodyHtml: string | null;
  senderType: 'agent' | 'customer';
  createdAt: string;
  author: { id: string; name: string };
}

interface Props {
  ticket: Ticket;
}

export default function ReplyThread({ ticket }: Props) {
  const { data } = useQuery({
    queryKey: ['replies', ticket.id],
    queryFn: () => apiFetch<{ replies: Reply[] }>(`/api/tickets/${ticket.id}/replies`),
  });

  const replies = data?.replies ?? [];

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Replies</h2>
      <div className="space-y-3">
      {replies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No replies yet.</p>
      ) : (
        replies.map((reply) => (
          <div
            key={reply.id}
            className={`rounded-xl border p-4 ${
              reply.senderType === 'agent' ? 'bg-muted/30' : 'bg-blue-50 dark:bg-blue-950/30'
            }`}
          >
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{reply.author.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  reply.senderType === 'agent'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {reply.senderType}
                </span>
              </div>
              <span>
                {new Date(reply.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div
              className="text-sm whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.bodyHtml ?? reply.body) }}
            />
          </div>
        ))
      )}
      </div>
    </div>
  );
}
