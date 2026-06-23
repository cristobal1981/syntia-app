'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { tramites } from '@/content/tramites'
import { cn } from '@/lib/utils'
import type { TramitesSnapshot } from '@/src/modules/tramites/domain/types'
import {
  defaultTramitesListFilters,
  filterTramitesList,
  getTramiteListItemStateBadge,
  hasActiveTramitesFilters,
  type TramitesListFilters,
} from '@/src/modules/tramites/domain/filter-tramites'
import {
  getTramiteListItemKey,
  mergeTramitesList,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { PortalDocumentsCell } from '@/src/modules/portal/ui/portal-documents-cell'
import { PORTAL_LIST_PAGE_SIZE } from '@/src/modules/portal/ui/list-pagination'
import { PortalRecordTable } from '@/src/modules/portal/ui/portal-record-table'
import { TramiteDetailDrawer } from '@/src/modules/tramites/ui/tramite-detail-drawer'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'
import { TramiteTypeBadge } from '@/src/modules/tramites/ui/tramite-type-badge'
import { TramitesFiltersToolbar } from '@/src/modules/tramites/ui/tramites-filters-toolbar'

type TramitesListSectionProps = {
  items: TramiteListItem[]
  tagFilterActive: boolean
  filteredEmpty: boolean
}

function TramitesListSection({
  items,
  tagFilterActive,
  filteredEmpty,
}: TramitesListSectionProps) {
  const copy = tramites.list
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<TramiteListItem | null>(null)
  const paginationId = 'tramites-pagination-label'

  useEffect(() => {
    setPage(1)
  }, [items])

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: copy.columns.name,
        cellClassName: 'max-w-[240px] font-medium text-foreground',
        render: (item: TramiteListItem) => (
          <span className="line-clamp-2">{item.name}</span>
        ),
      },
      {
        id: 'type',
        header: copy.columns.type,
        render: (item: TramiteListItem) => <TramiteTypeBadge kind={item.kind} />,
      },
      {
        id: 'state',
        header: copy.columns.state,
        render: (item: TramiteListItem) => {
          const stateBadge = getTramiteListItemStateBadge(item)
          return (
            <TaskStateBadge label={stateBadge.label} variant={stateBadge.variant} />
          )
        },
      },
      {
        id: 'documents',
        header: copy.columns.documents,
        render: (item: TramiteListItem) => (
          <PortalDocumentsCell count={item.attachmentCount} />
        ),
      },
      {
        id: 'actions',
        header: copy.columns.actions,
        render: (item: TramiteListItem) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              setSelectedItem(item)
            }}
            aria-label={`${copy.viewItem}: ${item.name}`}
          >
            {copy.viewItem}
          </Button>
        ),
      },
    ],
    [copy]
  )

  if (!items.length) {
    return (
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-sans text-lg font-semibold text-foreground">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          {tagFilterActive ? (
            <p className="mt-2 text-xs text-muted-foreground">{copy.tagFilterNote}</p>
          ) : null}
        </div>
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h3 className="font-sans text-base font-semibold text-foreground">
            {filteredEmpty ? tramites.filters.noResultsTitle : copy.emptyTitle}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {filteredEmpty
              ? tramites.filters.noResultsDescription
              : copy.emptyDescription}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-semibold text-foreground">
          {copy.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        {tagFilterActive ? (
          <p className="mt-2 text-xs text-muted-foreground">{copy.tagFilterNote}</p>
        ) : null}
      </div>

      <PortalRecordTable
        columns={columns}
        rows={items}
        rowKey={getTramiteListItemKey}
        onRowClick={setSelectedItem}
        page={page}
        pageSize={PORTAL_LIST_PAGE_SIZE}
        onPageChange={setPage}
        paginationId={paginationId}
      />

      <TramiteDetailDrawer
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null)
        }}
      />
    </section>
  )
}

type TramitesPageViewProps = {
  data: TramitesSnapshot
}

export function TramitesPageView({ data }: TramitesPageViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filters, setFilters] = useState<TramitesListFilters>(
    defaultTramitesListFilters
  )

  const allItems = useMemo(
    () => mergeTramitesList(data.tasks, data.tickets),
    [data.tasks, data.tickets]
  )

  const filteredItems = useMemo(
    () => filterTramitesList(allItems, filters),
    [allItems, filters]
  )

  const filtersActive = hasActiveTramitesFilters(filters)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {tramites.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{tramites.description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-busy={pending}
          onClick={() => {
            startTransition(() => {
              router.refresh()
            })
          }}
        >
          {pending ? tramites.refreshing : tramites.refreshButton}
        </Button>
      </header>

      <TramitesFiltersToolbar
        filters={filters}
        onChange={setFilters}
        items={allItems}
      />

      <TramitesListSection
        items={filteredItems}
        tagFilterActive={data.tagFilterActive}
        filteredEmpty={filtersActive && filteredItems.length === 0}
      />
    </div>
  )
}

type TramitesStateViewProps = {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function TramitesStateView({
  title,
  description,
  variant = 'default',
}: TramitesStateViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {tramites.title}
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
