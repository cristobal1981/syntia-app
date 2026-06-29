'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, MessageCircleWarning } from 'lucide-react'

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
  formatTramiteListItemKey,
  getTramiteListItemKey,
  getTramiteListRecordKind,
  mergeTramitesList,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { parseTramiteOpenParam } from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  isTramiteListItemNew,
  type TramitesListSeenState,
} from '@/src/modules/tramites/domain/tramites-list-seen-state'
import { PortalDocumentsCell } from '@/src/modules/portal/ui/portal-documents-cell'
import { PORTAL_LIST_PAGE_SIZE } from '@/src/modules/portal/ui/list-pagination'
import { PortalRecordTable } from '@/src/modules/portal/ui/portal-record-table'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'
import { TramiteDetailDrawer } from '@/src/modules/tramites/ui/tramite-detail-drawer'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'
import { TramiteTypeBadge } from '@/src/modules/tramites/ui/tramite-type-badge'
import { TramitesFiltersToolbar } from '@/src/modules/tramites/ui/tramites-filters-toolbar'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'
import { useTramitesListNewKeys } from '@/src/modules/tramites/ui/use-tramites-list-new-keys'

type TramitesListSectionProps = {
  items: TramiteListItem[]
  newItemKeys: readonly string[]
  tagFilterActive: boolean
  filteredEmpty: boolean
  selectedItem: TramiteListItem | null
  onSelectedItemChange: (item: TramiteListItem | null) => void
  drawerInitialTab?: 'conversation' | 'documents'
}

function TramitesListSection({
  items,
  newItemKeys,
  tagFilterActive,
  filteredEmpty,
  selectedItem,
  onSelectedItemChange,
  drawerInitialTab = 'conversation',
}: TramitesListSectionProps) {
  const copy = tramites.list
  const notifications = useChatterNotificationsOptional()
  const unreadLabel = portal.notifications.unreadBadge
  const newItemLabel = copy.newItemBadge
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
        render: (item: TramiteListItem) => {
          const recordKind = getTramiteListRecordKind(item)
          const hasUnread =
            notifications?.hasUnreadChatter(recordKind, item.id) ?? false
          const isNew = isTramiteListItemNew(item, newItemKeys)

          return (
            <div className="flex min-w-0 items-start gap-2">
              {isNew ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="mt-0.5 flex shrink-0 items-center justify-center"
                      aria-label={newItemLabel}
                    >
                      <Flame
                        className="size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{newItemLabel}</TooltipContent>
                </Tooltip>
              ) : null}
              {hasUnread ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="mt-0.5 flex shrink-0 items-center justify-center"
                      aria-label={unreadLabel}
                    >
                      <MessageCircleWarning
                        className="size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{unreadLabel}</TooltipContent>
                </Tooltip>
              ) : null}
              <span className="line-clamp-2 min-w-0">{item.name}</span>
            </div>
          )
        },
      },
      {
        id: 'type',
        header: copy.columns.type,
        render: (item: TramiteListItem) => <TramiteTypeBadge kind={item.kind} />,
      },
      {
        id: 'state',
        header: copy.columns.state,
        cellClassName: 'whitespace-nowrap',
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
        header: '',
        headerClassName: 'w-px px-2',
        cellClassName: 'w-px whitespace-nowrap px-2 text-right',
        render: (item: TramiteListItem) => (
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
        ),
      },
    ],
    [copy, newItemKeys, newItemLabel, notifications, onSelectedItemChange, unreadLabel]
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
  seenState: TramitesListSeenState | null
}

export function TramitesPageView({ data, seenState }: TramitesPageViewProps) {
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

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) return

    setFilters((prev) => ({ ...prev, query: q }))
    router.replace('/tramites', { scroll: false })
  }, [router, searchParams])

  const allItems = useMemo(
    () => mergeTramitesList(data.tasks, data.tickets),
    [data.tasks, data.tickets]
  )

  const { newItemKeys, markItemSeen: markItemSeenBase } = useTramitesListNewKeys(
    allItems,
    seenState
  )

  const notificationNewKeys = useMemo(
    () =>
      (notifications?.unread ?? [])
        .filter((item) => item.reason === 'new_tramite')
        .map((item) => formatTramiteListItemKey(item.listKind, item.recordId)),
    [notifications?.unread]
  )

  const displayNewItemKeys = useMemo(
    () => [...new Set([...newItemKeys, ...notificationNewKeys])],
    [newItemKeys, notificationNewKeys]
  )

  const dismissNewTramiteNotification =
    notifications?.dismissNewTramiteNotification

  const markItemSeen = useCallback(
    (item: TramiteListItem) => {
      markItemSeenBase(item)
      if (item.kind === 'tramite') {
        dismissNewTramiteNotification?.('task', item.id)
      }
    },
    [dismissNewTramiteNotification, markItemSeenBase]
  )

  const handledOpenParamRef = useRef<string | null>(null)
  const pendingOpenUrlCleanupRef = useRef(false)

  useEffect(() => {
    const openParam = searchParams.get('open')
    if (!openParam) {
      handledOpenParamRef.current = null
      return
    }

    if (handledOpenParamRef.current === openParam) return

    const parsed = parseTramiteOpenParam(openParam)
    if (!parsed) return

    const { kind, recordId } = parsed

    const item = allItems.find(
      (entry) => entry.kind === kind && entry.id === recordId
    )
    if (!item) {
      return
    }

    handledOpenParamRef.current = openParam
    pendingOpenUrlCleanupRef.current = true
    const tabParam = searchParams.get('tab')
    setDrawerInitialTab(tabParam === 'documents' ? 'documents' : 'conversation')
    markItemSeen(item)
    setSelectedItem(item)
  }, [
    allItems,
    markItemSeen,
    searchParams,
  ])

  useEffect(() => {
    if (!pendingOpenUrlCleanupRef.current || selectedItem === null) return
    if (!searchParams.get('open')) {
      pendingOpenUrlCleanupRef.current = false
      return
    }

    const timeoutId = window.setTimeout(() => {
      pendingOpenUrlCleanupRef.current = false
      router.replace('/tramites', { scroll: false })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [router, searchParams, selectedItem])

  const handleSelectItem = (item: TramiteListItem | null) => {
    if (item) {
      markItemSeen(item)
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
        newItemKeys={displayNewItemKeys}
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
