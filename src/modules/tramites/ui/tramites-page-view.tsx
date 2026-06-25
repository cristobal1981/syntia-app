'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { portal } from '@/content/portal'
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
  getTramiteListRecordKind,
  mergeTramitesList,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { PortalDocumentsCell } from '@/src/modules/portal/ui/portal-documents-cell'
import { PORTAL_LIST_PAGE_SIZE } from '@/src/modules/portal/ui/list-pagination'
import { PortalRecordTable } from '@/src/modules/portal/ui/portal-record-table'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'
import { TramiteDetailDrawer } from '@/src/modules/tramites/ui/tramite-detail-drawer'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'
import { TramiteTypeBadge } from '@/src/modules/tramites/ui/tramite-type-badge'
import { TramitesFiltersToolbar } from '@/src/modules/tramites/ui/tramites-filters-toolbar'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'

type TramitesListSectionProps = {
  items: TramiteListItem[]
  tagFilterActive: boolean
  filteredEmpty: boolean
  selectedItem: TramiteListItem | null
  onSelectedItemChange: (item: TramiteListItem | null) => void
  drawerInitialTab?: 'conversation' | 'documents'
}

function TramitesListSection({
  items,
  tagFilterActive,
  filteredEmpty,
  selectedItem,
  onSelectedItemChange,
  drawerInitialTab = 'conversation',
}: TramitesListSectionProps) {
  const copy = tramites.list
  const notifications = useChatterNotificationsOptional()
  const unreadLabel = portal.notifications.unreadBadge
  const [page, setPage] = useState(1)
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
        cellClassName: 'text-right',
        render: (item: TramiteListItem) => {
          const recordKind = getTramiteListRecordKind(item)
          const hasUnread =
            notifications?.isUnread(recordKind, item.id) ?? false

          return (
            <div className="flex items-center justify-end gap-2">
              {hasUnread ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="flex size-5 shrink-0 cursor-default items-center justify-center"
                      aria-label={unreadLabel}
                    >
                      <span className="size-3 rounded-full bg-primary ring-2 ring-primary/25" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left">{unreadLabel}</TooltipContent>
                </Tooltip>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectedItemChange(item)
                }}
                aria-label={`${copy.viewItem}: ${item.name}`}
              >
                {copy.viewItem}
              </Button>
            </div>
          )
        },
      },
    ],
    [copy, notifications, onSelectedItemChange, unreadLabel]
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
        onRowClick={onSelectedItemChange}
        page={page}
        pageSize={PORTAL_LIST_PAGE_SIZE}
        onPageChange={setPage}
        paginationId={paginationId}
      />

      <TramiteDetailDrawer
        item={selectedItem}
        open={selectedItem !== null}
        initialTab={drawerInitialTab}
        onOpenChange={(open) => {
          if (!open) onSelectedItemChange(null)
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
  const searchParams = useSearchParams()
  const notifications = useChatterNotificationsOptional()
  const [filters, setFilters] = useState<TramitesListFilters>(
    defaultTramitesListFilters
  )
  const [selectedItem, setSelectedItem] = useState<TramiteListItem | null>(null)
  const [drawerInitialTab, setDrawerInitialTab] = useState<
    'conversation' | 'documents'
  >('conversation')

  const allItems = useMemo(
    () => mergeTramitesList(data.tasks, data.tickets),
    [data.tasks, data.tickets]
  )

  useEffect(() => {
    const openParam = searchParams.get('open')
    if (!openParam) return

    const match = /^(tramite|incidencia)-(\d+)$/.exec(openParam)
    if (!match) return

    const kind = match[1] as TramiteListItem['kind']
    const recordId = Number.parseInt(match[2] ?? '', 10)
    if (!Number.isInteger(recordId) || recordId <= 0) return

    const item = allItems.find(
      (entry) => entry.kind === kind && entry.id === recordId
    )
    if (!item) {
      notifications?.clearPendingNavigation()
      return
    }

    const tabParam = searchParams.get('tab')
    setDrawerInitialTab(tabParam === 'documents' ? 'documents' : 'conversation')
    setSelectedItem(item)
    router.replace('/tramites', { scroll: false })
  }, [allItems, notifications, router, searchParams])

  const handleSelectItem = (item: TramiteListItem | null) => {
    if (item) {
      setDrawerInitialTab('conversation')
    }
    setSelectedItem(item)
  }

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
        <PortalRefreshButton
          label={tramites.refreshButton}
          refreshingLabel={tramites.refreshing}
        />
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
        selectedItem={selectedItem}
        onSelectedItemChange={handleSelectItem}
        drawerInitialTab={drawerInitialTab}
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
