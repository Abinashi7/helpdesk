import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Inbox, CircleDot, Bot, Zap, Clock } from 'lucide-react';
import type { TicketStats } from '@helpdesk/core';
import { apiFetch } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { cn } from '@/lib/utils';

type DailyVolume = { date: string; count: number };

function fetchStats() {
  return apiFetch<TicketStats>('/api/tickets/stats');
}

function fetchDailyVolume() {
  return apiFetch<DailyVolume[]>('/api/tickets/daily-volume');
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactElement;
  iconClass?: string;
}

function StatCard({ label, value, sub, icon, iconClass }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn('flex size-8 items-center justify-center rounded-lg', iconClass)}>
          {icon}
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-9 w-20" />
      <Skeleton className="mt-1 h-3 w-24" />
    </div>
  );
}

function formatResolutionTime(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function formatAxisDate(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

interface TooltipPayload { active?: boolean; payload?: Array<{ value: number }>; label?: string }

const ChartTooltip = ({ active, payload, label }: TooltipPayload) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label ? formatAxisDate(label) : ''}</p>
      <p className="text-muted-foreground">{payload[0].value} ticket{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

export default function HomePage() {
  const { data: stats, isPending: statsPending, isError: statsError } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: fetchStats,
  });

  const { data: volume, isPending: volumePending, isError: volumeError } = useQuery({
    queryKey: ['ticket-daily-volume'],
    queryFn: fetchDailyVolume,
  });

  return (
    <div className="p-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your support queue</p>
      </div>

      {statsError && <ErrorMessage className="mt-6">Failed to load stats.</ErrorMessage>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statsPending ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatCard
              label="Total Tickets"
              value={stats.total.toLocaleString()}
              sub="All time"
              icon={<Inbox className="size-4" />}
              iconClass="bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-400"
            />
            <StatCard
              label="Open Tickets"
              value={stats.open.toLocaleString()}
              sub="Awaiting response"
              icon={<CircleDot className="size-4" />}
              iconClass="bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400"
            />
            <StatCard
              label="Resolved by AI"
              value={stats.resolvedByAi.toLocaleString()}
              sub="Auto-resolved tickets"
              icon={<Bot className="size-4" />}
              iconClass="bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400"
            />
            <StatCard
              label="AI Resolution Rate"
              value={`${stats.aiResolutionPercent}%`}
              sub="Of all resolved tickets"
              icon={<Zap className="size-4" />}
              iconClass="bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-400"
            />
            <StatCard
              label="Avg Resolution Time"
              value={formatResolutionTime(stats.avgResolutionHours)}
              sub="From creation to resolved"
              icon={<Clock className="size-4" />}
              iconClass="bg-sky-50 text-sky-500 dark:bg-sky-500/15 dark:text-sky-400"
            />
          </>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Tickets per Day</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Last 30 days</p>
          </div>
        </div>

        {volumeError && <ErrorMessage className="mt-4">Failed to load chart data.</ErrorMessage>}

        <div className="mt-4 h-56">
          {volumePending ? (
            <Skeleton className="h-full w-full" />
          ) : volume ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v, i) => (i % 5 === 0 ? formatAxisDate(v) : '')}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  className="fill-muted-foreground"
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-cursor)' }} />
                <Bar dataKey="count" fill="var(--chart-bar)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
