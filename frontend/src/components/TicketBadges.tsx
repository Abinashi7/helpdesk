import { TicketStatus, TicketCategory } from '@helpdesk/core';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.new]:        'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
    [TicketStatus.processing]: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    [TicketStatus.open]:       'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    [TicketStatus.pending]:    'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
    [TicketStatus.resolved]:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    [TicketStatus.closed]:     'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory | null }) {
  if (!category) return <span className="text-muted-foreground text-xs">—</span>;
  const styles: Record<TicketCategory, string> = {
    [TicketCategory.billing]:   'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
    [TicketCategory.technical]: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    [TicketCategory.account]:   'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
    [TicketCategory.general]:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[category]}`}>
      {category}
    </span>
  );
}
