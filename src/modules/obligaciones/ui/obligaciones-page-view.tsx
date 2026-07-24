'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { obligaciones } from '@/content/obligaciones'
import { cn } from '@/lib/utils'
import { collectClientObligacionModels } from '@/src/modules/obligaciones/domain/collect-client-obligacion-models'
import {
  filterObligacionListRows,
} from '@/src/modules/obligaciones/domain/filter-obligaciones-list'
import { groupObligacionesByModel } from '@/src/modules/obligaciones/domain/group-obligaciones-by-model'
import { parseObligacionOpenParam } from '@/src/modules/portal/domain/chatter-notifications-types'
import { flattenObligacionesYear } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'
import type {
  ObligacionTask,
  ObligacionYear,
  ObligacionesSnapshot,
} from '@/src/modules/obligaciones/domain/types'
import { ObligacionDetailDrawer } from '@/src/modules/obligaciones/ui/obligacion-detail-drawer'
import { ObligacionModelGroupsList } from '@/src/modules/obligaciones/ui/obligacion-model-groups-list'
import { ObligacionesModelsOverview } from '@/src/modules/obligaciones/ui/obligaciones-models-overview'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'

function yearHeading(year: ObligacionYear): string {
  if (year.year > 0) return String(year.year)
  return year.label || obligaciones.yearFallbackLabel
}

type YearAccordionProps = {
  year: ObligacionYear
  defaultOpen: boolean
  searchQuery: string
  selectedModel: string | null
  onOpenTask: (task: ObligacionTask) => void
}

function YearAccordion({
  year,
  defaultOpen,
  searchQuery,
  selectedModel,
  onOpenTask,
}: YearAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [page, setPage] = useState(1)

  const groups = useMemo(() => {
    const rows = flattenObligacionesYear(year)
    const filteredRows = filterObligacionListRows(rows, searchQuery, selectedModel)
    return groupObligacionesByModel(filteredRows)
  }, [year, searchQuery, selectedModel])

  useEffect(() => {
    setPage(1)
  }, [groups.length, searchQuery])

  if (!groups.length) {
    return null
  }

  return (
    <section className="portal-home-card overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-muted/25"
        aria-expanded={open}
      >
        <div>
          <h2 className="font-sans text-base font-semibold text-foreground">
            {yearHeading(year)}
          </h2>
          {year.label && year.year > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{year.label}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-border px-4 py-4 dark:border-border">
          <ObligacionModelGroupsList
            groups={groups}
            page={page}
            onPageChange={setPage}
            paginationId={`obligaciones-${year.year}-pagination`}
            onOpenTask={onOpenTask}
          />
        </div>
      ) : null}
    </section>
  )
}

type ObligacionesPageViewProps = {
  data: ObligacionesSnapshot
}

export function ObligacionesPageView({ data }: ObligacionesPageViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTask, setSelectedTask] = useState<ObligacionTask | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) return

    setSearchQuery(q)
    router.replace('/obligaciones', { scroll: false })
  }, [router, searchParams])

  const hasAnyVisibleYear = useMemo(
    () =>
      data.years.some((year) => {
        const rows = flattenObligacionesYear(year)
        return filterObligacionListRows(rows, searchQuery, selectedModel).length > 0
      }),
    [data.years, searchQuery, selectedModel]
  )

  const hasAnyData = data.years.some((year) => flattenObligacionesYear(year).length > 0)

  const clientModels = useMemo(
    () => collectClientObligacionModels(data),
    [data]
  )

  const allTasks = useMemo(
    () => data.years.flatMap((year) => flattenObligacionesYear(year)),
    [data.years]
  )

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

    const task = allTasks.find((entry) => entry.id === parsed.recordId)
    if (!task) return

    handledOpenParamRef.current = openParam
    setSelectedTask(task)
    router.replace('/obligaciones', { scroll: false })
  }, [allTasks, router, searchParams])

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

          <ObligacionesModelsOverview
            models={clientModels}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />

          {hasAnyVisibleYear ? (
            <div className="flex flex-col gap-4">
              {data.years.map((year, index) => (
                <YearAccordion
                  key={year.label}
                  year={year}
                  defaultOpen={index === 0}
                  searchQuery={searchQuery}
                  selectedModel={selectedModel}
                  onOpenTask={setSelectedTask}
                />
              ))}
            </div>
          ) : (
            <div className="portal-home-card rounded-xl px-6 py-10 text-center">
              <h2 className="font-sans text-base font-semibold text-foreground">
                {obligaciones.filters.noResultsTitle}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {obligaciones.filters.noResultsDescription}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-base font-semibold text-foreground">
            {obligaciones.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {obligaciones.emptyDescription}
          </p>
        </div>
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
