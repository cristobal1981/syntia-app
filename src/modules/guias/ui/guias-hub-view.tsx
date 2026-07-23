'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarClock, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { guias, type GuideEntry } from '@/content/guias'
import { cn } from '@/lib/utils'
import { formatKeywordHashtag } from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import type { RelevantTaxWindow } from '@/src/modules/guias/domain/tax-calendar'
import {
  getGuidesByCategory,
  getGuidesForWindowSlugs,
  guideMatchesQuery,
} from '@/src/modules/guias/domain/guide-search'

const copy = guias.hub

type GuideCardProps = {
  entry: GuideEntry
}

function GuideCard({ entry }: GuideCardProps) {
  return (
    <Link
      href={`/guias/${entry.slug}`}
      className={cn(
        'portal-home-card portal-home-card-interactive group flex h-full flex-col rounded-xl px-5 py-4 md:px-6 md:py-5',
        'transition-[box-shadow,border-color,background-color] duration-300 ease-out',
        'hover:border-primary/70 hover:bg-primary/[0.04] hover:shadow-[0_0_0_1px_var(--primary)]',
        'dark:hover:border-primary/60 dark:hover:bg-muted/25',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'motion-reduce:transition-none'
      )}
    >
      <h3 className="font-sans text-sm font-semibold leading-snug text-foreground">
        {entry.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {entry.description}
      </p>
      {entry.tags.length ? (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-hidden>
          {entry.tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center rounded-full border border-foreground/15 bg-foreground/[0.06] px-2.5 py-0.5 text-xs font-semibold text-foreground dark:border-border dark:bg-input/40"
            >
              {formatKeywordHashtag(tag)}
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  )
}

type RelevantWindowCardProps = {
  relevant: RelevantTaxWindow
}

function RelevantWindowCard({ relevant }: RelevantWindowCardProps) {
  const { window, status } = relevant
  const relatedGuides = getGuidesForWindowSlugs(window.guideSlugs)

  return (
    <article className="portal-home-card flex h-full flex-col rounded-xl px-5 py-4 md:px-6 md:py-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-sans text-sm font-semibold leading-snug text-foreground">
          {window.title}
        </h3>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
            status === 'active'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {status === 'active' ? copy.activeBadge : copy.upcomingBadge}
        </span>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarClock className="size-4 shrink-0" aria-hidden />
        {window.rangeLabel}
      </p>

      {relatedGuides.length ? (
        <ul className="mt-3 space-y-1" aria-label={copy.relatedGuidesLabel}>
          {relatedGuides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guias/${guide.slug}`}
                className="text-sm font-medium text-accent-on-light underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-primary"
              >
                {guide.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {window.modelCodes.length ? (
        <ul
          className="mt-3 flex flex-wrap gap-1.5"
          aria-label={copy.relatedModelsLabel}
        >
          {window.modelCodes.map((code) => (
            <li key={code}>
              <Link
                href={`/guias/modelos-aeat?modelo=${code}`}
                className="inline-flex items-center rounded-full border border-foreground/15 bg-foreground/[0.06] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground hover:border-primary/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-border dark:bg-input/40"
              >
                {code}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

type GuiasHubViewProps = {
  relevantWindows: RelevantTaxWindow[]
}

export function GuiasHubView({ relevantWindows }: GuiasHubViewProps) {
  const [query, setQuery] = useState('')
  const trimmedQuery = query.trim()
  const isSearching = trimmedQuery.length > 0

  const visibleGroups = useMemo(() => {
    const groups = getGuidesByCategory()
    if (!trimmedQuery) return groups

    return groups
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) =>
          guideMatchesQuery(entry, trimmedQuery)
        ),
      }))
      .filter((group) => group.entries.length > 0)
  }, [trimmedQuery])

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {copy.description}
        </p>
      </header>

      <div>
        <label htmlFor="guias-search" className="sr-only">
          {copy.searchLabel}
        </label>
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="guias-search"
            type="search"
            name="guias-search"
            value={query}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {!isSearching && relevantWindows.length ? (
        <section aria-labelledby="guias-now-title">
          <h2
            id="guias-now-title"
            className="font-sans text-lg font-semibold text-foreground"
          >
            {copy.nowTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.nowDescription}</p>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relevantWindows.map((relevant) => (
              <li key={relevant.window.id} className="min-w-0">
                <RelevantWindowCard relevant={relevant} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visibleGroups.length ? (
        <div className="flex flex-col gap-8">
          {visibleGroups.map((group) => (
            <section key={group.category} aria-labelledby={`guias-${group.category}`}>
              <h2
                id={`guias-${group.category}`}
                className="font-sans text-lg font-semibold text-foreground"
              >
                {group.label}
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.entries.map((entry) => (
                  <li key={entry.slug} className="min-w-0">
                    <GuideCard entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
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
