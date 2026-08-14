'use client'

import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PortalSearchToolbarProps = {
  searchId: string
  searchLabel: string
  searchPlaceholder: string
  query: string
  onQueryChange: (value: string) => void
  /** Label del botón de borrar (accesible); si se omite, no se muestra botón. */
  clearLabel?: string
  /** Control adicional junto al input (p. ej. el checkbox "incluir cerrados" de trámites). */
  trailing?: ReactNode
  /** Fila de chips de filtro debajo del input. */
  filters?: ReactNode
  className?: string
}

export function PortalSearchToolbar({
  searchId,
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  clearLabel,
  trailing,
  filters,
  className,
}: PortalSearchToolbarProps) {
  const isSearching = query.trim().length > 0

  return (
    <div className={cn('portal-home-card flex flex-col gap-3 rounded-xl p-3', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <label htmlFor={searchId} className="sr-only">
            {searchLabel}
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={searchId}
            type="search"
            name={searchId}
            value={query}
            placeholder={searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'h-10 bg-input pl-9',
              clearLabel && '[&::-webkit-search-cancel-button]:appearance-none pr-9'
            )}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {clearLabel && isSearching ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
              <span className="sr-only">{clearLabel}</span>
            </button>
          ) : null}
        </div>

        {trailing}
      </div>

      {filters}
    </div>
  )
}
