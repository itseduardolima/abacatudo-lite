export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`motion-safe:animate-pulse rounded-pill bg-surface ${className}`} />
}

export function ListSkeleton({ rows = 4, avatarClassName = 'h-10 w-10' }: { rows?: number; avatarClassName?: string }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-surface py-3 last:border-b-0">
          <Skeleton className={`flex-shrink-0 rounded-full ${avatarClassName}`} />
          <div className="flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({ fields = 1 }: { fields?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-12" />
        </div>
      ))}
      <Skeleton className="mt-2 h-12" />
    </div>
  )
}
