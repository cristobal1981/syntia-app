'use client'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'

export const PORTAL_LIST_PAGE_SIZE = 15

type ListPaginationProps = {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  id: string
  className?: string
}

export function ListPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  id,
  className,
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const copy = portal.pagination

  if (totalItems <= pageSize) {
    return null
  }

  return (
    <nav
      className={cn(
        'flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-border',
        className
      )}
      aria-labelledby={id}
    >
      <p id={id} className="text-sm text-muted-foreground tabular-nums">
        {copy.pageLabel} {page} {copy.ofLabel} {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {copy.previous}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {copy.next}
        </Button>
      </div>
    </nav>
  )
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
