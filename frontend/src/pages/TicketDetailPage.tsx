import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { type Ticket } from '@helpdesk/core';
import { apiFetch } from '@/lib/api';
import { ErrorMessage } from '@/components/ui/error-message';
import BackLink from '@/components/BackLink';
import TicketDetailSkeleton from '@/components/TicketDetailSkeleton';
import TicketDetail from '@/components/TicketDetail';
import TicketSidebar from '@/components/TicketSidebar';
import ReplyThread from '@/components/ReplyThread';
import ReplyCompose from '@/components/ReplyCompose';
import TicketSummary from '@/components/TicketSummary';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isPending, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch<Ticket>(`/api/tickets/${id}`),
    enabled: !!id,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <BackLink to="/tickets" label="Back to tickets" />

      {isPending && <TicketDetailSkeleton />}

      {isError && (
        <ErrorMessage className="mt-6">Failed to load ticket.</ErrorMessage>
      )}

      {ticket && (
        <div className="mt-6 grid grid-cols-[1fr_260px] gap-8 items-start">
          <div>
            <TicketDetail ticket={ticket} />
            <TicketSummary ticket={ticket} />
            <ReplyThread ticket={ticket} />
            <ReplyCompose ticket={ticket} />
          </div>
          <TicketSidebar ticket={ticket} />
        </div>
      )}
    </div>
  );
}
