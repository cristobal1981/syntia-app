import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

export function StaffHomeBentoSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando inicio">
        <header className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-56 md:h-9 md:w-72" />
        </header>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            <div className="portal-home-card rounded-xl p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-10 w-16" />
              <Skeleton className="mt-1 h-4 w-24" />
              <Skeleton className="mt-4 h-3 w-full rounded" />
            </div>

            <div className="portal-home-card rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="overflow-hidden rounded-xl border border-border dark:border-border/50">
                <div className="border-b border-border px-4 py-3 dark:border-border/50">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex gap-4 border-b border-border px-4 py-3 last:border-b-0 dark:border-border/50"
                  >
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="portal-home-card flex items-start gap-4 rounded-xl p-4 md:p-5">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="mt-1 h-4 w-24" />
                </div>
              </div>
            ))}

            <div className="portal-home-card rounded-xl p-5">
              <Skeleton className="h-5 w-28" />
              <div className="mt-4 flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
