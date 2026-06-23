'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fiscalModelsGuide } from '@/content/fiscal-models-guide'
import { cn } from '@/lib/utils'
import {
  fiscalModelMatchesQuery,
  formatKeywordHashtag,
  getSortedFiscalModelGuideEntries,
  normalizeGuideSearchText,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import type { FiscalModelGuideEntry } from '@/content/fiscal-models-guide'

type FiscalModelGuideCardProps = {
  entry: FiscalModelGuideEntry
  searchQuery: string
  onKeywordClick: (keyword: string) => void
}

function FiscalModelGuideCard({
  entry,
  searchQuery,
  onKeywordClick,
}: FiscalModelGuideCardProps) {
  const activeQuery = normalizeGuideSearchText(searchQuery)

  return (
    <article
      className={cn(
        'portal-home-card group flex h-full flex-col rounded-xl px-5 py-4 md:px-6 md:py-5',
        'transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out',
        'hover:-translate-y-1 hover:border-primary/55 hover:bg-primary/[0.04] hover:shadow-lg hover:shadow-primary/15',
        'dark:hover:border-primary/45 dark:hover:bg-primary/[0.08] dark:hover:shadow-primary/10',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-white',
            'transition-[transform,box-shadow] duration-300 ease-out',
            'group-hover:scale-105 group-hover:shadow-md group-hover:shadow-primary/25',
            'dark:bg-primary/15 dark:text-primary dark:group-hover:bg-primary/25',
            'motion-reduce:group-hover:scale-100'
          )}
          aria-hidden
        >
          <span className="font-sans text-xl font-bold tabular-nums">
            {entry.code}
          </span>
        </div>
        <h2 className="min-w-0 flex-1 font-sans text-sm font-semibold leading-snug text-foreground">
          <span className="sr-only">{entry.label}. </span>
          {entry.title}
        </h2>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {entry.description}
      </p>
      {entry.tags.length ? (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Palabras clave">
          {entry.tags.map((tag) => {
            const isActive =
              activeQuery.length > 0 &&
              normalizeGuideSearchText(tag).includes(activeQuery)

            return (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => onKeywordClick(tag)}
                  className={cn(
                    'inline-flex min-h-7 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'border-primary bg-primary text-white'
                      : 'border-foreground/15 bg-foreground/[0.06] text-foreground dark:border-input dark:bg-input/50 dark:text-foreground'
                  )}
                >
                  {formatKeywordHashtag(tag)}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </article>
  )
}

export function FiscalModelsGuidePageView() {
  const copy = fiscalModelsGuide
  const [query, setQuery] = useState('')

  const visibleModels = useMemo(() => {
    const entries = getSortedFiscalModelGuideEntries()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return entries
    return entries.filter((entry) => fiscalModelMatchesQuery(entry, trimmedQuery))
  }, [query])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Button type="button" variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/obligaciones">
            <ArrowLeft className="size-4" aria-hidden />
            <span className="ml-2">{copy.backToObligaciones}</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
      </header>

      <>
        <label htmlFor="fiscal-models-guide-search" className="sr-only">
          {copy.searchLabel}
        </label>
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="fiscal-models-guide-search"
            type="search"
            name="fiscal-models-guide-search"
            value={query}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </>

      {visibleModels.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleModels.map((entry) => (
            <li key={entry.code} className="min-w-0">
              <FiscalModelGuideCard
                entry={entry}
                searchQuery={query}
                onKeywordClick={setQuery}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-base font-semibold text-foreground">
            {copy.noResultsTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.noResultsDescription}
          </p>
        </div>
      )}
    </div>
  )
}
