import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TicketStatus, TicketCategory, STATUS_LABELS, CATEGORY_LABELS, type Ticket } from '@helpdesk/core';
import { apiFetch, apiPatch } from '@/lib/api';

const AGENT_STATUSES = [TicketStatus.open, TicketStatus.pending, TicketStatus.closed] as const;
const AI_STATUSES = new Set<TicketStatus>([TicketStatus.new, TicketStatus.processing, TicketStatus.resolved]);

interface Agent {
  id: string;
  name: string;
}

interface Props {
  ticket: Ticket;
}

const selectClass =
  'w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';
const labelClass = 'text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block';

const decisionReasonLabels = {
  not_genuine_support_request: 'Not a genuine support request',
  legal_threat: 'Possible legal threat',
  chargeback_or_dispute: 'Chargeback or disputed charge',
  account_security: 'Account-security concern',
  refund_requires_human: 'Refund requires human handling',
  kb_not_complete: 'Knowledge base does not fully answer the request',
  kb_section_uncertain: 'Knowledge-base section is uncertain',
  typesafe_error: 'TypeSafe triage failed',
  generation_error: 'Reply generation failed',
} as const;

export default function TicketSidebar({ ticket }: Props) {
  const queryClient = useQueryClient();
  const ticketKey = ['ticket', String(ticket.id)];

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiFetch<{ agents: Agent[] }>('/api/users/agents'),
  });
  const agents = agentsData?.agents ?? [];

  const updateMutation = useMutation({
    mutationFn: (patch: { status?: TicketStatus; category?: TicketCategory | null }) =>
      apiPatch(`/api/tickets/${ticket.id}`, patch),
    onSuccess: (updated) => queryClient.setQueryData(ticketKey, updated),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      apiPatch(`/api/tickets/${ticket.id}/assign`, { assignedToId }),
    onSuccess: (updated) => queryClient.setQueryData(ticketKey, updated),
  });

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div>
        <label className={labelClass}>Status</label>
        {AI_STATUSES.has(ticket.status) ? (
          <div className={`${selectClass} text-muted-foreground cursor-default`}>
            {STATUS_LABELS[ticket.status]}
          </div>
        ) : (
          <select
            value={ticket.status}
            onChange={(e) => updateMutation.mutate({ status: e.target.value as TicketStatus })}
            disabled={updateMutation.isPending}
            className={selectClass}
          >
            {AGENT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        )}
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

      {ticket.aiDecision ? (
        <div className="border-t pt-4">
          <label className={labelClass}>AI Triage</label>
          <p className="text-sm">
            {ticket.aiDecision.decision === 'auto_resolve' ? 'Auto-resolved' : 'Sent to human review'}
            {' by '}
            <span className="font-medium">{ticket.aiDecision.model}</span>
          </p>
          {ticket.aiDecision.kb && (
            <p className="mt-1 text-xs text-muted-foreground">
              KB coverage {ticket.aiDecision.kb.answerProbability.toFixed(2)}
              {ticket.aiDecision.kb.sectionTitle && (
                <> · {ticket.aiDecision.kb.sectionTitle} ({ticket.aiDecision.kb.sectionConfidence.toFixed(2)} section confidence)</>
              )}
            </p>
          )}
          {ticket.aiDecision.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {ticket.aiDecision.reasons.map((reason) => (
                <li key={reason}>{decisionReasonLabels[reason]}</li>
              ))}
            </ul>
          )}
        </div>
      ) : ticket.aiConfidence != null ? (
        <div className="border-t pt-4">
          <label className={labelClass}>AI Triage</label>
          <p className="text-sm">
            {ticket.resolvedByAi ? 'Auto-resolved at ' : 'Escalated at '}
            <span className="font-medium">{ticket.aiConfidence.toFixed(2)} confidence</span>
            {!ticket.resolvedByAi &&
              (ticket.aiConfidence < 0.85
                ? ', below the 0.85 threshold'
                : ' — blocked by an escalation rule')}
          </p>
          {ticket.aiKbSection ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Grounded in knowledge base &sect;{ticket.aiKbSection}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              No knowledge base section covered this question.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
