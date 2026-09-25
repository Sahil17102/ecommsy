interface SkeletonProps {
  className?: string;
}

/** Base skeleton block — apply Tailwind size/shape classes via `className`. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

/** A skeleton shaped like a rounded pill / badge. */
export function SkeletonBadge({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded-full ${className}`} />;
}

/** A skeleton that mimics a single line of text. */
export function SkeletonText({ className = "" }: SkeletonProps) {
  return <div className={`skeleton h-3 rounded ${className}`} />;
}

/** A skeleton row for a desktop orders table. */
export function OrdersSkeletonRow() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_140px_148px_164px_96px_40px] items-center gap-4 px-5 py-4 border-b border-border-light/60 last:border-0">
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-28 rounded" />
          <SkeletonBadge className="h-4 w-16" />
          <Skeleton className="h-4 w-8 rounded" />
        </div>
        <SkeletonText className="w-20" />
      </div>
      <SkeletonText className="w-24" />
      <SkeletonText className="w-20" />
      <div className="flex items-center gap-1.5">
        <SkeletonText className="w-24" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-16 rounded ml-auto" />
        <SkeletonText className="w-10 ml-auto" />
      </div>
      <div />
    </div>
  );
}

/** A skeleton card for mobile orders list. */
export function OrdersMobileSkeletonCard() {
  return (
    <div className="p-4 space-y-3 border-b border-border-light/60 last:border-0">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28 rounded" />
          <div className="flex gap-1.5">
            <SkeletonBadge className="h-4 w-16" />
            <Skeleton className="h-4 w-8 rounded" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-3.5 w-16 rounded ml-auto" />
          <SkeletonText className="w-10 ml-auto" />
        </div>
      </div>
      <div className="pt-1 flex items-center justify-between border-t border-border-light/50">
        <div className="flex gap-3">
          <SkeletonText className="w-20" />
          <SkeletonText className="w-16" />
        </div>
        <SkeletonText className="w-24" />
      </div>
    </div>
  );
}
