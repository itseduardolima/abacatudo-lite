import { Skeleton } from '@/components/ui/Skeleton'

const ROWS = [0, 1, 2, 3, 4]

export function TotalSkeleton({ extraLines = 0 }: { extraLines?: number }) {
  return (
    <section aria-hidden>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-11 w-52" />
      {Array.from({ length: extraLines }, (_, index) => (
        <Skeleton key={index} className="mt-2 h-4 w-44" />
      ))}
    </section>
  )
}

export function BreakdownRowsSkeleton() {
  return (
    <div aria-hidden>
      {ROWS.map((key) => (
        <div key={key} className="flex flex-col gap-2 border-b border-surface py-3.5 last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-3 pl-12">
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-3 w-[4.75rem]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SubscriptionRowsSkeleton() {
  return (
    <div aria-hidden>
      {ROWS.map((key) => (
        <div key={key} className="flex items-center gap-3 border-b border-surface py-3.5 last:border-b-0">
          <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-44" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SavingsRowsSkeleton() {
  return (
    <div aria-hidden>
      {ROWS.slice(0, 4).map((key) => (
        <div key={key} className="border-b border-surface py-4 last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}
