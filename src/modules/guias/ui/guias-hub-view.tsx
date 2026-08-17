'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { AlarmClock, CalendarClock, ChevronRight } from 'lucide-react'

import { guias, type GuideEntry } from '@/content/guias'
import { appLinkPortalClassName } from '@/components/ui/app-link'
import { cn } from '@/lib/utils'
import { formatKeywordHashtag } from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import { GUIDE_CATEGORY_ICON } from '@/src/modules/guias/ui/guide-category-icon'
import type { RelevantTaxWindow } from '@/src/modules/guias/domain/tax-calendar'
import {
  getGuidesByCategory,
  getGuidesForWindowSlugs,
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
        'dark:hover:border-transparent dark:hover:shadow-none',
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
      <div className="mt-4 flex items-end justify-between gap-3">
        {entry.tags.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-hidden>
            {entry.tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center rounded-full border border-foreground/15 bg-foreground/[0.06] px-2.5 py-0.5 text-xs font-semibold text-foreground dark:border-foreground/20 dark:bg-foreground/10"
              >
                {formatKeywordHashtag(tag)}
              </li>
            ))}
          </ul>
        ) : (
          <span aria-hidden />
        )}
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold',
            appLinkPortalClassName
          )}
        >
          {copy.readGuide}
          <ChevronRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
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
  const visibleGroups = useMemo(() => getGuidesByCategory(), [])

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

      {relevantWindows.length ? (
        <section
          aria-labelledby="guias-now-title"
          className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 md:p-6 dark:border-primary/25 dark:bg-primary/[0.06]"
        >
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <AlarmClock className="size-4" aria-hidden />
            </span>
            <h2
              id="guias-now-title"
              className="font-sans text-lg font-semibold text-foreground"
            >
              {copy.nowTitle}
            </h2>
            <div aria-hidden />
            <p className="text-sm text-muted-foreground">{copy.nowDescription}</p>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relevantWindows.map((relevant) => (
              <li key={relevant.window.id} className="min-w-0">
                <RelevantWindowCard relevant={relevant} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-8">
        {visibleGroups.map((group) => {
          const CategoryIcon = GUIDE_CATEGORY_ICON[group.category]
          return (
            <section key={group.category} aria-labelledby={`guias-${group.category}`}>
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CategoryIcon className="size-4" aria-hidden />
                </span>
                <div className="flex items-baseline gap-1.5">
                  <h2
                    id={`guias-${group.category}`}
                    className="font-sans text-lg font-semibold text-foreground"
                  >
                    {group.label}
                  </h2>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {group.entries.length}
                  </span>
                </div>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.entries.map((entry) => (
                  <li key={entry.slug} className="min-w-0">
                    <GuideCard entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
