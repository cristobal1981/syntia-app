'use client'

import { replaceUrlShallow } from '@/src/modules/portal/ui/shallow-url'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight, ClipboardList, Paperclip, SearchX } from 'lucide-react'

import { PortalEmptyState } from '@/components/ui/portal-empty-state'

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
import { parseTramiteOpenParam } from '@/src/modules/portal/domain/portal-notifications-types'
import {
  type TramitesListSeenState,
} from '@/src/modules/tramites/domain/tramites-list-seen-state'
import {
  buildTramiteTree,
  collectVisibleDescendants,
  findRootContaining,
  flattenTramiteTree,
  getVisualDepth,
  type TramiteTreeNode,
  type TramiteTreeRow,
} from '@/src/modules/tramites/domain/tramites-tree'
import {
  paginateItems,
  PORTAL_LIST_PAGE_SIZE,
} from '@/src/modules/portal/ui/list-pagination'
import { PortalRecordTable } from '@/src/modules/portal/ui/portal-record-table'
import { prefetchDrawerBundle } from '@/src/modules/portal/ui/record-drawer-bundle'
import { TramiteActivityBadge } from '@/src/modules/tramites/ui/tramite-activity-badge'
import { TramiteDetailDrawer } from '@/src/modules/tramites/ui/tramite-detail-drawer'
import { formatTramiteDate } from '@/src/modules/tramites/domain/format-tramite-date'
import { TramitePriorityIndicator } from '@/src/modules/tramites/ui/tramite-priority-indicator'
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
  /** Visibles (filtrados y ordenados por actividad). */
  items: TramiteListItem[]
  /** Todos, sin filtrar: dan el resumen de subtareas y la navegación del drawer. */
  allItems: TramiteListItem[]
  /** Hay una búsqueda activa: los trámites con subtareas visibles se despliegan. */
  searchActive: boolean
  newItemKeys: readonly string[]
  filteredEmpty: boolean
  selectedItem: TramiteListItem | null
  onSelectedItemChange: (item: TramiteListItem | null) => void
  onAttachmentCountChange?: (item: TramiteListItem, attachmentCount: number) => void
  drawerInitialTab?: 'conversation' | 'documents'
  canWriteTramites: boolean
}

const INDENT_CLASS = ['', '', 'ml-3'] as const

function TramitesListSection({
  items,
  allItems,
  searchActive,
  newItemKeys,
  filteredEmpty,
  selectedItem,
  onSelectedItemChange,
  onAttachmentCountChange,
  drawerInitialTab = 'conversation',
  canWriteTramites,
}: TramitesListSectionProps) {
  const copy = tramites.list
  const subtasksCopy = tramites.subtasks
  const notifications = usePortalNotificationsOptional()
  const notificationsUnread = notifications?.unread
  const unread = useMemo(() => notificationsUnread ?? [], [notificationsUnread])
  const [page, setPage] = useState(1)
  // Lo que el usuario ha plegado/desplegado a mano manda sobre el auto-despliegue.
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({})
  const paginationId = 'tramites-pagination-label'

  // La paginación cuenta raíces: las subtareas viajan con su trámite.
  const roots = useMemo(() => buildTramiteTree(items, allItems), [items, allItems])

  const hasNews = useCallback(
    (item: TramiteListItem) =>
      getTramiteActivitySignal(item, unread, newItemKeys) !== null,
    [unread, newItemKeys]
  )

  const selectedKey = selectedItem ? getTramiteListItemKey(selectedItem) : null
  const isAutoExpanded = useCallback(
    (node: TramiteTreeNode) => {
      if (!node.children.length) return false
      if (searchActive) return true
      const below = collectVisibleDescendants(node)
      return (
        below.some(hasNews) ||
        (selectedKey !== null &&
          below.some((entry) => getTramiteListItemKey(entry) === selectedKey))
      )
    },
    [hasNews, searchActive, selectedKey]
  )

  const isExpanded = useCallback(
    (node: TramiteTreeNode) =>
      expandedOverride[getTramiteListItemKey(node.item)] ?? isAutoExpanded(node),
    [expandedOverride, isAutoExpanded]
  )

  const toggleNode = useCallback(
    (node: TramiteTreeNode) => {
      const key = getTramiteListItemKey(node.item)
      setExpandedOverride((current) => ({
        ...current,
        [key]: !(current[key] ?? isAutoExpanded(node)),
      }))
    },
    [isAutoExpanded]
  )

  // Dos efectos coordinados a propósito (orden de declaración importa: el
  // reset a página 1 corre primero, luego el salto a la página del
  // seleccionado lo sobrescribe si aplica) — reescribirlo como ajuste
  // durante el render exigiría reproducir esa combinación a mano sin tests
  // que lo verifiquen; se documenta y se acepta tal cual.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [items])

  useEffect(() => {
    if (!selectedItem) return
    const root = findRootContaining(roots, selectedItem)
    if (!root) return
    const itemPage = Math.floor(roots.indexOf(root) / PORTAL_LIST_PAGE_SIZE) + 1
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage((current) => (current === itemPage ? current : itemPage))
  }, [roots, selectedItem])

  const rows = useMemo(
    () =>
      flattenTramiteTree(
        paginateItems(roots, page, PORTAL_LIST_PAGE_SIZE),
        isExpanded
      ),
    [roots, page, isExpanded]
  )

  const pageItems = useMemo(() => rows.map((row) => row.node.item), [rows])
  const anyExpandable = rows.some((row) => row.node.children.length > 0)

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
        render: ({ node, depth }: TramiteTreeRow) => {
          const { item } = node
          const expanded = node.children.length > 0 && isExpanded(node)
          const hiddenNews = expanded
            ? 0
            : collectVisibleDescendants(node).filter(hasNews).length
          return (
            <div
              className="flex min-w-0 items-center gap-2 sm:pl-(--tramite-indent)"
              style={
                {
                  '--tramite-indent': `${getVisualDepth(depth) * 1.25}rem`,
                } as React.CSSProperties
              }
            >
              {depth > 0 ? (
                <span
                  className="-mt-2 hidden h-3 w-3 shrink-0 rounded-bl-md border-b-2 border-l-2 border-muted-foreground/40 sm:block"
                  aria-hidden
                />
              ) : null}
              {node.children.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={(expanded ? subtasksCopy.hide : subtasksCopy.show).replace(
                    '{name}',
                    item.name
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleNode(node)
                  }}
                  className="-m-2.5 flex size-11 shrink-0 cursor-pointer sm:-ml-2 sm:m-0 sm:size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <ChevronRight
                    className={cn(
                      'size-4 transition-transform sm:size-5 motion-reduce:transition-none',
                      expanded && 'rotate-90'
                    )}
                    aria-hidden
                  />
                </button>
              ) : anyExpandable ? (
                // Mismo hueco que el botón de desplegar: los nombres de hermanos quedan alineados.
                <span className="hidden size-8 shrink-0 sm:-ml-2 sm:block" aria-hidden />
              ) : null}
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                <span
                  className={cn(
                    'line-clamp-2 min-w-0',
                    depth === 0 ? 'font-semibold' : 'font-medium'
                  )}
                  title={item.name}
                >
                  {item.name}
                </span>
                <TramiteActivityBadge
                  signal={getTramiteActivitySignal(item, unread, newItemKeys)}
                />
                {node.descendantTotal > 0 ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {subtasksCopy.summary
                      .replace('{closed}', String(node.descendantClosed))
                      .replace('{total}', String(node.descendantTotal))}
                  </span>
                ) : null}
                {hiddenNews > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground dark:bg-background">
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                    {subtasksCopy.news.replace('{count}', String(hiddenNews))}
                  </span>
                ) : null}
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
            </div>
          )
        },
      },
      {
        id: 'priority',
        header: copy.columns.priority,
        cellClassName: 'w-px whitespace-nowrap',
        render: ({ node }: TramiteTreeRow) => (
          <TramitePriorityIndicator priority={node.item.priority} />
        ),
      },
      {
        id: 'tags',
        header: copy.columns.tags,
        cellClassName: 'whitespace-nowrap',
        hideLabelInCard: true,
        render: ({ node, depth }: TramiteTreeRow) => {
          const stateBadge = getTramiteListItemStateBadge(node.item)
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Un subtrámite es siempre un trámite: el chip de tipo solo suma ruido. */}
              {depth === 0 ? <TramiteTypeBadge kind={node.item.kind} /> : null}
              <TaskStateBadge label={stateBadge.label} variant={stateBadge.variant} />
            </div>
          )
        },
      },
      {
        id: 'updated',
        header: copy.columns.updated,
        cellClassName: 'w-px whitespace-nowrap tabular-nums text-muted-foreground',
        render: ({ node }: TramiteTreeRow) => formatTramiteDate(node.item.modifiedAt) || '—',
      },
    ],
    [
      copy,
      subtasksCopy,
      hasNews,
      isExpanded,
      anyExpandable,
      newItemKeys,
      toggleNode,
      unread,
    ]
  )

  if (!items.length) {
    return (
      <section className="flex flex-col gap-4">
        <PortalEmptyState
          icon={filteredEmpty ? SearchX : ClipboardList}
          title={filteredEmpty ? tramites.filters.noResultsTitle : copy.emptyTitle}
          description={
            filteredEmpty ? tramites.filters.noResultsDescription : copy.emptyDescription
          }
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <PortalRecordTable
        columns={columns}
        rows={rows}
        rowKey={(row) => getTramiteListItemKey(row.node.item)}
        onRowClick={(row) => onSelectedItemChange(row.node.item)}
        // El ratón se detiene sobre una fila: se calienta lo que abrirá el drawer (chat y descripción).
        onRowIntent={(row) => prefetchDrawerBundle(getTramiteListRecordKind(row.node.item), row.node.item.id)}
        // Hover marcado: el de los subtrámites se perdía contra su fondo tenue.
        rowClassName={(row) =>
          row.depth > 0
            ? 'bg-muted/20 hover:bg-muted/70 dark:bg-background/50 dark:hover:bg-primary/15'
            : 'hover:bg-muted/60 dark:hover:bg-primary/10'
        }
        cardClassName={(row) =>
          row.depth > 0
            ? cn(
                'gap-2 rounded-l-none border-l-2 border-l-primary/40 bg-muted/20 p-3 hover:bg-muted/70 dark:bg-background/50 dark:hover:bg-primary/15',
                INDENT_CLASS[getVisualDepth(row.depth)]
              )
            : undefined
        }
        cardLinkedToPrevious={(row) => row.depth > 0}
        flatOnMobile
        rowsArePaged
        totalItems={roots.length}
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
        allItems={allItems}
        onNavigateItem={(item) => onSelectedItemChange(item)}
        onOpenChange={(open) => {
          if (!open) onSelectedItemChange(null)
        }}
        canWriteTramites={canWriteTramites}
      />
    </section>
  )
}

type TramitesPageViewProps = {
  data: TramitesSnapshot
  seenState: TramitesListSeenState | null
  canWriteTramites: boolean
}

/**
 * Lista de trámites y consultas con filtros, «nuevo» y drawer. El orden se
 * congela con el drawer abierto y `?open=`/`?q=` se consumen y se limpian de la URL.
 */
export function TramitesPageView({
  data,
  seenState,
  canWriteTramites,
}: TramitesPageViewProps) {
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

    // Semilla única desde el query param de la URL, y limpia la URL con
    // la URL (efecto externo real, no puede hacerse en el render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters((prev) => ({ ...prev, query: q }))
    replaceUrlShallow('/tramites')
  }, [searchParams])

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
    // Refresca el item seleccionado con los datos recién llegados de Odoo
    // (adjuntos/estado/fecha) sin perder la identidad de "cuál está
    // seleccionado" — no es estado derivable en render porque `selectedItem`
    // también cambia por acción directa del usuario (clic en fila).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Abre el drawer desde el query param `open`/`tab` de la URL; el efecto
    // de abajo limpia esa URL (sin ir al servidor) — efecto externo real.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      replaceUrlShallow('/tramites')
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [searchParams, selectedItem])

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
  if (selectedItem === null && sortedItems !== liveSortedItems) {
    setSortedItems(liveSortedItems)
  }

  const filtersActive = hasActiveTramitesFilters(filters)

  return (
    <div className="flex flex-col gap-8">
      <TramitesFiltersToolbar
        filters={filters}
        onChange={setFilters}
        items={allItems}
      />

      <TramitesListSection
        items={sortedItems}
        allItems={allItems}
        searchActive={filters.query.trim().length > 0}
        newItemKeys={displayNewItemKeys}
        filteredEmpty={filtersActive && filteredItems.length === 0}
        selectedItem={selectedItem}
        onSelectedItemChange={handleSelectItem}
        onAttachmentCountChange={handleAttachmentCountChange}
        drawerInitialTab={drawerInitialTab}
        canWriteTramites={canWriteTramites}
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
    <div
      className={cn(
        'portal-home-card rounded-xl px-6 py-10 text-center',
        variant === 'destructive' && 'border-destructive/30'
      )}
    >
      <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
