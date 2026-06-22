'use client'

import { Button } from '@/components/ui/button'
import { tramites } from '@/content/tramites'

type ListPaginationProps = {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  id: string
}

export function ListPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  id,
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalItems <= pageSize) {
    return null
  }

  return (
    <nav
      className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-input/50"
      aria-labelledby={id}
    >
      <p id={id} className="text-sm text-muted-foreground tabular-nums">
        {tramites.pagination.pageLabel} {page} {tramites.pagination.ofLabel}{' '}
        {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {tramites.pagination.previous}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {tramites.pagination.next}
        </Button>
      </div>
    </nav>
  )
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
