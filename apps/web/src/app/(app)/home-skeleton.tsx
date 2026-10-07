import { Skeleton } from '@/components/ui/Skeleton'

export function HeroSkeleton() {
  return (
    <div className="rounded-card-lg bg-inverse px-5 py-6" aria-hidden>
      <div className="h-3 w-28 motion-safe:animate-pulse rounded-pill bg-on-inverse-hairline" />
      <div className="mt-3 h-11 w-48 motion-safe:animate-pulse rounded-pill bg-on-inverse-hairline" />
      <div className="mt-7 h-3.5 motion-safe:animate-pulse rounded-pill bg-on-inverse-hairline" />
      <div className="my-4 h-px bg-on-inverse-hairline" />
      <div className="ml-auto flex w-28 flex-col items-end gap-2">
        <div className="h-3 w-14 motion-safe:animate-pulse rounded-pill bg-on-inverse-hairline" />
        <div className="h-5 w-24 motion-safe:animate-pulse rounded-pill bg-on-inverse-hairline" />
      </div>
    </div>
  )
}

export function InvoicesSkeleton() {
  return (
    <section aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="mt-1">
        {[0, 1, 2].map((key) => (
          <div key={key} className="border-b border-surface py-3.5 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="mt-2.5 h-2" />
            <div className="mt-1.5 flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
