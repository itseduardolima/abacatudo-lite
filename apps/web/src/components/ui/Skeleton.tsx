export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`motion-safe:animate-pulse rounded-pill bg-surface ${className}`} />
}
