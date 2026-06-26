import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type ChatterSkeletonProps = {
  className?: string
}

function IncomingBubbleSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[78%] space-y-2 rounded-2xl rounded-bl-md border border-border bg-muted/40 px-3 py-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-full max-w-[200px]" />
        <Skeleton className="h-3 w-4/5 max-w-[160px]" />
      </div>
    </div>
  )
}

function OutgoingBubbleSkeleton() {
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] space-y-2 rounded-2xl rounded-br-md bg-primary/15 px-3 py-2.5">
        <Skeleton className="h-3 w-8 bg-primary/25" />
        <Skeleton className="h-3 w-full max-w-[140px] bg-primary/25" />
      </div>
    </div>
  )
}

export function ChatterSkeleton({ className }: ChatterSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden>
      <IncomingBubbleSkeleton />
      <OutgoingBubbleSkeleton />
      <IncomingBubbleSkeleton />
      <OutgoingBubbleSkeleton />
      <IncomingBubbleSkeleton />
    </div>
  )
}

export function ChatterComposerSkeleton() {
  return (
    <div className="min-w-0 flex-1" aria-hidden>
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="flex gap-1 border-b border-border px-1 py-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="size-8 rounded-md" />
          ))}
        </div>
        <div className="space-y-2 px-4 py-3">
          <Skeleton className="h-3 w-full max-w-[220px]" />
          <Skeleton className="h-3 w-3/4 max-w-[160px]" />
        </div>
      </div>
    </div>
  )
}
