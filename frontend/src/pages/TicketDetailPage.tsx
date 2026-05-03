import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TicketStatus, TicketCategory } from '@helpdesk/core';
import { apiFetch } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, CategoryBadge } from '@/components/TicketBadges';

interface TicketDetail {
  id: number;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  category: TicketCategory | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isPending, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch<TicketDetail>(`/api/tickets/${id}`),
    enabled: !!id,
  });

  return (
    <div className="p-8 max-w-3xl">
      <Link to="/tickets" className="text-sm text-muted-foreground link">
        ← Back to tickets
      </Link>

      {isPending && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-7 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <p className="mt-6 text-sm text-destructive">Failed to load ticket.</p>
      )}

      {ticket && (
        <div className="mt-6">
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <CategoryBadge category={ticket.category} />
          </div>

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

          <div className="mt-6 rounded-xl border bg-muted/30 p-4">
            <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}
