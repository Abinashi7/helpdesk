import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { type Ticket } from '@helpdesk/core';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';

interface Props {
  ticket: Ticket;
}

export default function TicketSummary({ ticket }: Props) {
  const [summary, setSummary] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiPost<{ summary: string }>(`/api/tickets/${ticket.id}/summarize`, {}),
    onSuccess: (data) => setSummary(data.summary),
  });

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {mutation.isPending ? 'Summarizing…' : 'Summarize'}
      </Button>

      {mutation.isError && (
        <ErrorMessage className="mt-2 text-xs">Failed to summarize ticket.</ErrorMessage>
      )}

      {summary && !mutation.isPending && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Summary
          </p>
          <p className="text-foreground">{summary}</p>
        </div>
      )}
    </div>
  );
}
