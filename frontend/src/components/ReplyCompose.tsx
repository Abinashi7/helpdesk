import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ReplySenderType, type Ticket } from '@helpdesk/core';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import type { Reply } from './ReplyThread';

interface Props {
  ticket: Ticket;
}

export default function ReplyCompose({ ticket }: Props) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [polishError, setPolishError] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      apiPost<Reply>(`/api/tickets/${ticket.id}/replies`, { body: text, senderType: ReplySenderType.agent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', ticket.id] });
      setBody('');
    },
  });

  const polishMutation = useMutation({
    mutationFn: (text: string) =>
      apiPost<{ polished: string }>(`/api/tickets/${ticket.id}/replies/polish`, { body: text }),
    onSuccess: (data) => {
      setBody(data.polished);
      setPolishError(null);
    },
    onError: () => setPolishError('Failed to polish reply.'),
  });

  const busy = sendMutation.isPending || polishMutation.isPending;

  return (
    <div className="mt-4">
      <textarea
        aria-label="Reply body"
        className="w-full rounded-xl border bg-muted/30 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        rows={4}
        placeholder="Write a reply…"
        value={body}
        onChange={(e) => { setBody(e.target.value); setPolishError(null); }}
        disabled={busy}
      />
      {sendMutation.isError && (
        <ErrorMessage className="mt-1 text-xs">Failed to send reply.</ErrorMessage>
      )}
      {polishError && (
        <ErrorMessage className="mt-1 text-xs">{polishError}</ErrorMessage>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const trimmed = body.trim();
            if (trimmed) polishMutation.mutate(trimmed);
          }}
          disabled={busy || !body.trim()}
        >
          {polishMutation.isPending ? 'Polishing…' : 'Polish'}
        </Button>
        <Button
          type="button"
          onClick={() => {
            const trimmed = body.trim();
            if (trimmed) sendMutation.mutate(trimmed);
          }}
          disabled={busy || !body.trim()}
        >
          {sendMutation.isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </div>
  );
}
