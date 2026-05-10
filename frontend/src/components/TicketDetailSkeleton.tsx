import { Skeleton } from '@/components/ui/skeleton';

export default function TicketDetailSkeleton() {
  return (
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
  );
}
