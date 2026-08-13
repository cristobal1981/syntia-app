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

  return (
    <div
      className={cn(
        embedded ? 'overflow-x-auto' : 'portal-home-card overflow-x-auto rounded-xl'
      )}
    >
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
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      onRowClick(row)
                    }
                  : undefined
              }
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
