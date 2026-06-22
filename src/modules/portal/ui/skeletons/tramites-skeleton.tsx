import { Skeleton } from '@/components/ui/skeleton'

export function TramitesSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando trámites">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 md:h-9" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section key={sectionIndex} className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <div className="portal-home-card overflow-hidden rounded-xl">
            <div className="border-b border-border px-4 py-3">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex gap-4 border-b border-border px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
