'use client'

import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  ListPagination,
  paginateItems,
  PORTAL_LIST_PAGE_SIZE,
} from '@/src/modules/portal/ui/list-pagination'

export type PortalRecordTableSort = {
  columnId: string
  direction: 'asc' | 'desc'
}

export type PortalRecordTableColumn<T> = {
  id: string
  header: string
  sortable?: boolean
  headerClassName?: string
  cellClassName?: string
  /** En la tarjeta móvil, omite la etiqueta muda y pinta el valor solo. */
  hideLabelInCard?: boolean
  render: (row: T) => ReactNode
}

export type PortalRecordTableProps<T> = {
  columns: PortalRecordTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  sort?: PortalRecordTableSort | null
  onSortChange?: (sort: PortalRecordTableSort) => void
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  paginationId?: string
  minWidth?: string
  embedded?: boolean
}

function SortIndicator({
  columnId,
  sort,
}: {
  columnId: string
  sort?: PortalRecordTableSort | null
}) {
  if (!sort || sort.columnId !== columnId) {
    return <ArrowUpDown className="size-3.5 text-subtle-foreground" aria-hidden />
  }

  if (sort.direction === 'asc') {
    return <ArrowUp className="size-3.5" aria-hidden />
  }

  return <ArrowDown className="size-3.5" aria-hidden />
}

export function PortalRecordTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  sort = null,
  onSortChange,
  page = 1,
  pageSize = PORTAL_LIST_PAGE_SIZE,
  onPageChange,
  paginationId = 'portal-record-table-pagination',
  minWidth = '560px',
  embedded = false,
}: PortalRecordTableProps<T>) {
  const paginatedRows =
    onPageChange !== undefined ? paginateItems(rows, page, pageSize) : rows

  const chromeClassName = embedded
    ? undefined
    : 'bg-muted/50 dark:bg-muted'

  function handleSort(column: PortalRecordTableColumn<T>) {
    if (!column.sortable || !onSortChange) return

    if (sort?.columnId === column.id) {
      onSortChange({
        columnId: column.id,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      })
      return
    }

    onSortChange({ columnId: column.id, direction: 'asc' })
  }

  function handleRowKeyDown(event: React.KeyboardEvent, row: T) {
    if (!onRowClick) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onRowClick(row)
  }

  const rowInteractionProps = (row: T) => ({
    onClick: onRowClick ? () => onRowClick(row) : undefined,
    tabIndex: onRowClick ? 0 : undefined,
    role: onRowClick ? 'button' : undefined,
    onKeyDown: onRowClick ? (event: React.KeyboardEvent) => handleRowKeyDown(event, row) : undefined,
  })

  const titleColumn = columns[0]
  const secondaryColumns = columns.slice(1)

  return (
    <div
      className={cn(
        embedded ? undefined : 'portal-home-card rounded-xl'
      )}
    >
      <div className={cn('overflow-x-auto', !embedded && 'hidden sm:block')}>
        <table
          className="w-full text-left text-sm"
          style={{ minWidth }}
        >
          <thead className={chromeClassName}>
            <tr className="border-b border-border dark:border-border/50">
              {columns.map((column) => {
                const isSortable = Boolean(column.sortable && onSortChange)
                const ariaSort =
                  sort?.columnId === column.id
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      'px-4 py-3 font-sans font-medium text-muted-foreground',
                      column.headerClassName
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {column.header}
                        <SortIndicator columnId={column.id} sort={sort} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className={embedded ? undefined : 'bg-card'}>
            {paginatedRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  'border-b border-border transition-colors last:border-b-0 dark:border-border/50',
                  onRowClick &&
                    'cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset dark:hover:bg-muted/20'
                )}
                {...rowInteractionProps(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn('px-4 py-3', column.cellClassName)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!embedded ? (
        <ul className="flex flex-col gap-3 p-3 sm:hidden">
          {paginatedRows.map((row) => (
            <li key={rowKey(row)}>
              <article
                className={cn(
                  'flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4',
                  onRowClick &&
                    'cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
                )}
                {...rowInteractionProps(row)}
              >
                {titleColumn ? (
                  <div className="text-sm font-medium text-foreground">
                    {titleColumn.render(row)}
                  </div>
                ) : null}
                {secondaryColumns.map((column) =>
                  column.hideLabelInCard ? (
                    <div
                      key={column.id}
                      className="flex flex-wrap items-center gap-1.5"
                    >
                      {column.render(row)}
                    </div>
                  ) : (
                    <div
                      key={column.id}
                      className={cn(
                        'flex items-center gap-3 text-sm',
                        column.header ? 'justify-between' : 'justify-end'
                      )}
                    >
                      {column.header ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {column.header}
                        </span>
                      ) : null}
                      <span className="min-w-0">{column.render(row)}</span>
                    </div>
                  )
                )}
              </article>
            </li>
          ))}
        </ul>
      ) : null}

      {onPageChange ? (
        <ListPagination
          id={paginationId}
          page={page}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={onPageChange}
          className={chromeClassName}
        />
      ) : null}
    </div>
  )
}
