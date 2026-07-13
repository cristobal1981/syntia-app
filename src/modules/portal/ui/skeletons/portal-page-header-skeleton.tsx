import { Skeleton } from '@/components/ui/skeleton'

type PortalPageHeaderSkeletonProps = {
  showAction?: boolean
}

export function PortalPageHeaderSkeleton({
  showAction = false,
}: PortalPageHeaderSkeletonProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 md:h-9 md:w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-24" />
      </div>
      {showAction ? <Skeleton className="h-9 w-32 shrink-0" /> : null}
    </header>
  )
}
