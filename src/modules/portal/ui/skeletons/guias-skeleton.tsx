import { guias } from '@/content/guias'
import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

function GuideCardSkeleton() {
  return (
    <li className="min-w-0">
      <div className="portal-home-card flex h-full flex-col rounded-xl px-5 py-4 md:px-6 md:py-5">
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-2 flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </li>
  )
}

/**
 * Hub de guías: el título y la descripción son texto fijo (se pintan ya), y lo demás
 * (ventanas fiscales de ahora y categorías con sus tarjetas) en esqueleto.
 */
export function GuiasSkeleton() {
  const copy = guias.hub

  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando guías">
        <header>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.description}</p>
        </header>

        <section className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 md:p-6 dark:border-primary/25 dark:bg-primary/[0.06]">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <div aria-hidden />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <li key={index} className="min-w-0">
                <div className="portal-home-card flex h-full flex-col gap-3 rounded-xl px-5 py-4 md:px-6 md:py-5">
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-40" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {Array.from({ length: 2 }).map((_, section) => (
          <section key={section}>
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <Skeleton className="h-6 w-44" />
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((__, card) => (
                <GuideCardSkeleton key={card} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
