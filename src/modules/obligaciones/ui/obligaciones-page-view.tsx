'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlarmClock, CalendarCheck, SearchX } from 'lucide-react'

import { PortalEmptyState } from '@/components/ui/portal-empty-state'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { obligaciones } from '@/content/obligaciones'
import { cn } from '@/lib/utils'
import { attachObligacionDeadlineInfo, categorizeObligaciones } from '@/src/modules/obligaciones/domain/categorize-obligaciones'
import {
  filterObligacionListRows,
} from '@/src/modules/obligaciones/domain/filter-obligaciones-list'
import { groupObligacionesByModel } from '@/src/modules/obligaciones/domain/group-obligaciones-by-model'
import { parseObligacionOpenParam } from '@/src/modules/portal/domain/portal-notifications-types'
import { flattenObligacionesYear } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'
import type {
  ObligacionTask,
  ObligacionesSnapshot,
} from '@/src/modules/obligaciones/domain/types'
import { ObligacionClosedYears } from '@/src/modules/obligaciones/ui/obligacion-closed-years'
import { ObligacionDetailDrawer } from '@/src/modules/obligaciones/ui/obligacion-detail-drawer'
import { ObligacionModelGroupsList } from '@/src/modules/obligaciones/ui/obligacion-model-groups-list'
import { ObligacionUrgentList } from '@/src/modules/obligaciones/ui/obligacion-urgent-list'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'
import { PortalSearchToolbar } from '@/src/modules/portal/ui/portal-search-toolbar'

type ObligacionesPageViewProps = {
  data: ObligacionesSnapshot
}

export function ObligacionesPageView({ data }: ObligacionesPageViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTask, setSelectedTask] = useState<ObligacionTask | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingPage, setPendingPage] = useState(1)

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) return

    // Semilla única desde el query param de la URL, y limpia la URL con
    // router.replace (efecto externo real, no puede hacerse en el render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(q)
    router.replace('/obligaciones', { scroll: false })
  }, [router, searchParams])

  const hasAnyData = data.years.some((year) => flattenObligacionesYear(year).length > 0)

  const allRows = useMemo(
    () => data.years.flatMap((year) => flattenObligacionesYear(year)),
    [data.years]
  )

  const categorized = useMemo(() => {
    const filtered = filterObligacionListRows(allRows, searchQuery)
    return categorizeObligaciones(attachObligacionDeadlineInfo(filtered))
  }, [allRows, searchQuery])

  const pendingGroups = useMemo(
    () => groupObligacionesByModel(categorized.pending),
    [categorized.pending]
  )

  // Ajuste durante el render (no en un efecto): vuelve a la página 1 cuando
  // cambia el resultado filtrado de "En curso".
  const [prevPendingResetKey, setPrevPendingResetKey] = useState([
    pendingGroups.length,
    searchQuery,
  ])
  if (pendingGroups.length !== prevPendingResetKey[0] || searchQuery !== prevPendingResetKey[1]) {
    setPrevPendingResetKey([pendingGroups.length, searchQuery])
    setPendingPage(1)
  }

  const hasAnyVisibleResult =
    categorized.urgent.length > 0 || categorized.pending.length > 0 || categorized.closedByYear.length > 0

  const handledOpenParamRef = useRef<string | null>(null)

  useEffect(() => {
    const openParam = searchParams.get('open')
    if (!openParam) {
      handledOpenParamRef.current = null
      return
    }

    if (handledOpenParamRef.current === openParam) return

    const parsed = parseObligacionOpenParam(openParam)
    if (!parsed) return

    const task = allRows.find((entry) => entry.id === parsed.recordId)
    if (!task) return

    handledOpenParamRef.current = openParam
    // Abre el drawer desde el query param `open` de la URL y la limpia con
    // router.replace (efecto externo real, no puede hacerse en el render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTask(task)
    router.replace('/obligaciones', { scroll: false })
  }, [allRows, router, searchParams])

  const handleDrawerOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) setSelectedTask(null)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {obligaciones.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {obligaciones.description}
          </p>
        </div>
        <PortalRefreshButton
          label={obligaciones.refreshButton}
          refreshingLabel={obligaciones.refreshing}
        />
      </header>

      {hasAnyData ? (
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <AppLink
              href="/guias/modelos-aeat"
              className={cn('text-sm', appLinkPortalClassName)}
            >
              {obligaciones.guideLink}
            </AppLink>
          </div>

          <PortalSearchToolbar
            searchId="obligaciones-search"
            searchLabel={obligaciones.search.searchLabel}
            searchPlaceholder={obligaciones.search.searchPlaceholder}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            clearLabel={obligaciones.search.clearSearch}
          />

          {hasAnyVisibleResult ? (
            <div className="flex flex-col gap-8">
              {categorized.urgent.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-0.5">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      aria-hidden
                    >
                      <AlarmClock className="size-4" />
                    </span>
                    <h2 className="font-sans text-lg font-semibold text-foreground">
                      {obligaciones.urgent.title}
                    </h2>
                    <div aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      {obligaciones.urgent.description}
                    </p>
                  </div>
                  <ObligacionUrgentList rows={categorized.urgent} onOpenTask={setSelectedTask} />
                </section>
              ) : null}

              {categorized.pending.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <div>
                    <h2 className="font-sans text-lg font-semibold text-foreground">
                      {obligaciones.pending.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {obligaciones.pending.description}
                    </p>
                  </div>
                  <div className="portal-home-card overflow-hidden rounded-xl p-4">
                    <ObligacionModelGroupsList
                      groups={pendingGroups}
                      page={pendingPage}
                      onPageChange={setPendingPage}
                      paginationId="obligaciones-en-curso-pagination"
                      onOpenTask={setSelectedTask}
                    />
                  </div>
                </section>
              ) : null}

              {categorized.closedByYear.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <div>
                    <h2 className="font-sans text-lg font-semibold text-foreground">
                      {obligaciones.closed.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {obligaciones.closed.description}
                    </p>
                  </div>
                  <ObligacionClosedYears
                    closedByYear={categorized.closedByYear}
                    onOpenTask={setSelectedTask}
                  />
                </section>
              ) : null}
            </div>
          ) : (
            <PortalEmptyState
              icon={SearchX}
              title={obligaciones.search.noResultsTitle}
              description={obligaciones.search.noResultsDescription}
            />
          )}
        </div>
      ) : (
        <PortalEmptyState
          icon={CalendarCheck}
          title={obligaciones.emptyTitle}
          description={obligaciones.emptyDescription}
        />
      )}

      <ObligacionDetailDrawer
        task={selectedTask}
        open={selectedTask !== null}
        onOpenChange={handleDrawerOpenChange}
      />
    </div>
  )
}

type ObligacionesStateViewProps = {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function ObligacionesStateView({
  title,
  description,
  variant = 'default',
}: ObligacionesStateViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {obligaciones.title}
        </h1>
      </header>
      <div
        className={cn(
          'portal-home-card rounded-xl px-6 py-10 text-center',
          variant === 'destructive' && 'border-destructive/30'
        )}
      >
        <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
