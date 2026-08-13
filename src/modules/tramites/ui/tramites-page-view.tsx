'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Paperclip } from 'lucide-react'

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
  mergeTramitesList,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { parseTramiteOpenParam } from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  type TramitesListSeenState,
} from '@/src/modules/tramites/domain/tramites-list-seen-state'
import {
  paginateItems,
  PORTAL_LIST_PAGE_SIZE,
} from '@/src/modules/portal/ui/list-pagination'
import { PortalRecordTable } from '@/src/modules/portal/ui/portal-record-table'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'
import { TramiteActivityBadge } from '@/src/modules/tramites/ui/tramite-activity-badge'
import { TramiteDetailDrawer } from '@/src/modules/tramites/ui/tramite-detail-drawer'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'
import { TramiteTypeBadge } from '@/src/modules/tramites/ui/tramite-type-badge'
import { TramitesFiltersToolbar } from '@/src/modules/tramites/ui/tramites-filters-toolbar'
import { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'
import {
  getTramiteActivitySignal,
  sortTramiteListByActivity,
} from '@/src/modules/tramites/domain/tramite-activity-signal'
import { useTramitesListNewKeys } from '@/src/modules/tramites/ui/use-tramites-list-new-keys'

type TramitesListSectionProps = {
  items: TramiteListItem[]
  newItemKeys: readonly string[]
  filteredEmpty: boolean
  selectedItem: TramiteListItem | null
  onSelectedItemChange: (item: TramiteListItem | null) => void
  onAttachmentCountChange?: (item: TramiteListItem, attachmentCount: number) => void
  drawerInitialTab?: 'conversation' | 'documents'
}

function TramitesListSection({
  items,
  newItemKeys,
  filteredEmpty,
  selectedItem,
  onSelectedItemChange,
  onAttachmentCountChange,
  drawerInitialTab = 'conversation',
}: TramitesListSectionProps) {
  const copy = tramites.list
  const notifications = usePortalNotificationsOptional()
  const [page, setPage] = useState(1)
  const paginationId = 'tramites-pagination-label'

  useEffect(() => {
    setPage(1)
  }, [items])

  useEffect(() => {
    if (!selectedItem) return
    const index = items.findIndex(
      (entry) =>
        entry.id === selectedItem.id && entry.kind === selectedItem.kind
    )
    if (index < 0) return
    const itemPage = Math.floor(index / PORTAL_LIST_PAGE_SIZE) + 1
    setPage((current) => (current === itemPage ? current : itemPage))
  }, [items, selectedItem])

  const pageItems = useMemo(
    () => paginateItems(items, page, PORTAL_LIST_PAGE_SIZE),
    [items, page]
  )

  const pageNavIndex = selectedItem
    ? pageItems.findIndex(
        (entry) =>
          entry.id === selectedItem.id && entry.kind === selectedItem.kind
      )
    : -1

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: copy.columns.name,
        cellClassName: 'max-w-[360px] text-foreground',
        render: (item: TramiteListItem) => (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="line-clamp-2 min-w-0 font-semibold" title={item.name}>
              {item.name}
            </span>
            <TramiteActivityBadge
              signal={getTramiteActivitySignal(
                item,
                notifications?.unread ?? [],
                newItemKeys
              )}
            />
            {item.attachmentCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                aria-label={`${item.attachmentCount} ${copy.columns.documents}`}
              >
                <Paperclip className="size-3.5" aria-hidden />
                <span className="tabular-nums">{item.attachmentCount}</span>
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'tags',
        header: copy.columns.tags,
        cellClassName: 'whitespace-nowrap',
        hideLabelInCard: true,
        render: (item: TramiteListItem) => {
          const stateBadge = getTramiteListItemStateBadge(item)
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <TramiteTypeBadge kind={item.kind} />
              <TaskStateBadge label={stateBadge.label} variant={stateBadge.variant} />
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        headerClassName: 'w-px px-4',
        cellClassName: 'w-px whitespace-nowrap px-4 text-right',
        render: () => (
          <ChevronRight
            className="ml-auto size-4 text-muted-foreground"
            aria-hidden
          />
        ),
      },
    ],
    [copy, newItemKeys, notifications?.unread]
  )

  if (!items.length) {
    return (
      <section className="flex flex-col gap-4">
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-base font-semibold text-foreground">
            {filteredEmpty ? tramites.filters.noResultsTitle : copy.emptyTitle}
          </h2>
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
        onAttachmentCountChange={onAttachmentCountChange}
        pageItems={pageItems}
        pageItemIndex={pageNavIndex}
        onNavigateItem={(item) => onSelectedItemChange(item)}
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
  const notifications = usePortalNotificationsOptional()
  const [filters, setFilters] = useState<TramitesListFilters>(
    defaultTramitesListFilters
  )
  const [selectedItem, setSelectedItem] = useState<TramiteListItem | null>(null)
  const [attachmentCountOverrides, setAttachmentCountOverrides] = useState<
    Record<string, number>
  >({})
  const [drawerInitialTab, setDrawerInitialTab] = useState<
    'conversation' | 'documents'
  >('conversation')

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) return

    setFilters((prev) => ({ ...prev, query: q }))
    router.replace('/tramites', { scroll: false })
  }, [router, searchParams])

  const allItems = useMemo(() => {
    const merged = mergeTramitesList(data.tasks, data.tickets)
    return merged.map((item) => {
      const key = formatTramiteListItemKey(item.kind, item.id)
      const override = attachmentCountOverrides[key]
      if (override === undefined) return item
      return { ...item, attachmentCount: Math.max(item.attachmentCount, override) }
    })
  }, [attachmentCountOverrides, data.tasks, data.tickets])

  useEffect(() => {
    setSelectedItem((current) => {
      if (!current) return current
      const fresh = allItems.find(
        (entry) => entry.id === current.id && entry.kind === current.kind
      )
      if (!fresh) return current
      if (
        fresh.attachmentCount === current.attachmentCount &&
        fresh.modifiedAt === current.modifiedAt &&
        fresh.assignedNotifyPartnerIds.join(',') ===
          current.assignedNotifyPartnerIds.join(',')
      ) {
        return current
      }
      return fresh
    })
  }, [allItems])

  const { newItemKeys, markItemSeen: markItemSeenBase } = useTramitesListNewKeys(
    allItems,
    seenState
  )

  const notificationNewKeys = useMemo(
    () =>
      (notifications?.unread ?? [])
        .filter(
          (item): item is typeof item & { listKind: 'tramite' } =>
            item.reason === 'new_tramite' && item.listKind === 'tramite'
        )
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

  const handleAttachmentCountChange = useCallback(
    (item: TramiteListItem, attachmentCount: number) => {
      const key = formatTramiteListItemKey(item.kind, item.id)
      setAttachmentCountOverrides((current) => ({
        ...current,
        [key]: attachmentCount,
      }))
      setSelectedItem((current) =>
        current && current.id === item.id && current.kind === item.kind
          ? { ...current, attachmentCount }
          : current
      )
    },
    []
  )

  const filteredItems = useMemo(
    () => filterTramitesList(allItems, filters),
    [allItems, filters]
  )

  const liveSortedItems = useMemo(
    () =>
      sortTramiteListByActivity(
        filteredItems,
        notifications?.unread ?? [],
        displayNewItemKeys
      ),
    [filteredItems, notifications?.unread, displayNewItemKeys]
  )

  // Con el drawer abierto, el orden se congela: si reordenáramos en
  // caliente (p. ej. al marcar una notificación como vista al entrar en
  // el trámite), la fila saltaría de sitio bajo el usuario sin que cierre
  // nada. Solo se recalcula al volver a la vista completa (drawer cerrado).
  const [sortedItems, setSortedItems] = useState<TramiteListItem[]>(
    () => liveSortedItems
  )
  useEffect(() => {
    if (selectedItem === null) {
      setSortedItems(liveSortedItems)
    }
  }, [liveSortedItems, selectedItem])

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
        items={sortedItems}
        newItemKeys={displayNewItemKeys}
        filteredEmpty={filtersActive && filteredItems.length === 0}
        selectedItem={selectedItem}
        onSelectedItemChange={handleSelectItem}
        onAttachmentCountChange={handleAttachmentCountChange}
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
