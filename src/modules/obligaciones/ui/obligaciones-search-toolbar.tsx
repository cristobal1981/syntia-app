'use client'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { obligaciones } from '@/content/obligaciones'

type ObligacionesSearchToolbarProps = {
  query: string
  onQueryChange: (query: string) => void
}

export function ObligacionesSearchToolbar({
  query,
  onQueryChange,
}: ObligacionesSearchToolbarProps) {
  return (
    <>
      <label htmlFor="obligaciones-search" className="sr-only">
        {obligaciones.filters.searchLabel}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="obligaciones-search"
          type="search"
          name="obligaciones-search"
          value={query}
          placeholder={obligaciones.filters.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="bg-input pl-9"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
    </>
  )
}
