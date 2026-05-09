import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TicketStatus, TicketCategory, STATUS_LABELS, CATEGORY_LABELS } from '@helpdesk/core';
import { apiFetch, apiPatch } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface Agent {
  id: string;
  name: string;
}

interface TicketDetail {
  id: number;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  category: TicketCategory | null;
  status: TicketStatus;
  assignedTo: Agent | null;
  createdAt: string;
  updatedAt: string;
}

const selectClass =
  'w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';
const labelClass = 'text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block';


export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isPending, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch<TicketDetail>(`/api/tickets/${id}`),
    enabled: !!id,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiFetch<{ agents: Agent[] }>('/api/users/agents'),
  });

  const agents = agentsData?.agents ?? [];

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      apiPatch<TicketDetail>(`/api/tickets/${id}/assign`, { assignedToId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', id], updated);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (patch: { status?: TicketStatus; category?: TicketCategory | null }) =>
      apiPatch<TicketDetail>(`/api/tickets/${id}`, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', id], updated);
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/tickets" className="text-sm text-muted-foreground link">
        ← Back to tickets
      </Link>

      {isPending && (
        <div className="mt-6">
          <Skeleton className="h-7 w-96" />
          <div className="mt-6 grid grid-cols-[1fr_260px] gap-8 items-start">
            <div className="space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          </div>
        </div>
      )}

      {isError && (
        <p className="mt-6 text-sm text-destructive">Failed to load ticket.</p>
      )}

      {ticket && (
        <div className="mt-6">
          <div className="grid grid-cols-[1fr_260px] gap-8 items-start">
            {/* Left: title + message content */}
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

              <div className="mt-4 rounded-xl border bg-muted/30 p-4">
                <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
              </div>
            </div>

            {/* Right: properties sidebar */}
            <div className="space-y-4 rounded-xl border p-4">
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => updateMutation.mutate({ status: e.target.value as TicketStatus })}
                  disabled={updateMutation.isPending}
                  className={selectClass}
                >
                  {Object.values(TicketStatus).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={ticket.category ?? ''}
                  onChange={(e) => updateMutation.mutate({ category: (e.target.value || null) as TicketCategory | null })}
                  disabled={updateMutation.isPending}
                  className={selectClass}
                >
                  <option value="">— None —</option>
                  {Object.values(TicketCategory).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Assigned To</label>
                <select
                  value={ticket.assignedTo?.id ?? ''}
                  onChange={(e) => assignMutation.mutate(e.target.value || null)}
                  disabled={assignMutation.isPending}
                  className={selectClass}
                >
                  <option value="">— Unassigned —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
