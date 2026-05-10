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

  const mutation = useMutation({
    mutationFn: (text: string) =>
      apiPost<Reply>(`/api/tickets/${ticket.id}/replies`, { body: text, senderType: ReplySenderType.agent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', ticket.id] });
      setBody('');
    },
  });

  return (
    <div className="mt-4">
      <textarea
        aria-label="Reply body"
        className="w-full rounded-xl border bg-muted/30 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        rows={4}
        placeholder="Write a reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={mutation.isPending}
      />
      {mutation.isError && (
        <ErrorMessage className="mt-1 text-xs">Failed to send reply.</ErrorMessage>
      )}
      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          onClick={() => {
            const trimmed = body.trim();
            if (trimmed) mutation.mutate(trimmed);
          }}
          disabled={mutation.isPending || !body.trim()}
        >
          {mutation.isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </div>
  );
}
