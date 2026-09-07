import { Skeleton } from '@/components/ui/skeleton'

type PersonListSkeletonProps = {
  kind: 'gestor' | 'client' | 'worker'
  rows?: number
}

const COLUMN_COUNT: Record<PersonListSkeletonProps['kind'], number> = {
  gestor: 5,
  client: 6,
  worker: 4,
}

export function PersonListSkeleton({
  kind,
  rows = 6,
}: PersonListSkeletonProps) {
  const columnCount = COLUMN_COUNT[kind]

  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando listado">
      <Skeleton className="h-9 w-full max-w-md" />

      <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columnCount }).map((_, index) => (
              <Skeleton key={index} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 border-t border-border px-4 py-3"
          >
            {Array.from({ length: columnCount }).map((__, cellIndex) => (
              <Skeleton key={cellIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index}>
            <div className="portal-home-card rounded-xl px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
