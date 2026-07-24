'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fiscalModelsGuide } from '@/content/fiscal-models-guide'
import { guias } from '@/content/guias'
import { cn } from '@/lib/utils'
import {
  fiscalModelMatchesQuery,
  formatKeywordHashtag,
  getSortedFiscalModelGuideEntries,
  normalizeGuideSearchText,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import type { FiscalModelGuideEntry } from '@/content/fiscal-models-guide'

// Código de modelo pendiente de desplazamiento; sobrevive al doble montaje
// de StrictMode una vez consumido el parámetro de la URL.
let pendingScrollModelCode: string | null = null

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
      id={`modelo-${entry.code}`}
      className={cn(
        'portal-home-card portal-home-card-interactive group flex h-full flex-col rounded-xl px-5 py-4 md:px-6 md:py-5',
        'transition-[box-shadow,border-color,background-color] duration-300 ease-out',
        'hover:border-primary/70 hover:bg-primary/[0.04] hover:shadow-[0_0_0_1px_var(--primary)]',
        'dark:hover:border-primary/60 dark:hover:bg-muted/25',
        'motion-reduce:transition-none'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-white',
            'dark:bg-primary/15 dark:text-primary dark:group-hover:bg-primary/25'
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
                      : 'border-foreground/15 bg-foreground/[0.06] text-foreground dark:border-border dark:bg-input/40 dark:text-foreground'
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

export function FiscalModelsGuideView() {
  const copy = fiscalModelsGuide
  const [query, setQuery] = useState('')

  // Al llegar con ?modelo=<código> (desde una guía), desplaza hasta la ficha
  // y la resalta brevemente. No usamos scrollIntoView porque también
  // desplaza los ancestros con overflow-hidden (el shell del portal),
  // descolocando la barra superior; se desplaza solo el <main> scrollable.
  useEffect(() => {
    // Consumir el parámetro cuanto antes: los refrescos del router (p. ej. el
    // sondeo de notificaciones llama a router.refresh()) remontan la página y
    // volverían a disparar el desplazamiento a mitad de transición. El código
    // pendiente se guarda a nivel de módulo para sobrevivir al doble montaje
    // de StrictMode en desarrollo.
    const paramCode = new URLSearchParams(window.location.search).get('modelo')
    if (paramCode) {
      pendingScrollModelCode = paramCode
      const url = new URL(window.location.href)
      url.searchParams.delete('modelo')
      window.history.replaceState(null, '', url)
    }

    const code = pendingScrollModelCode
    if (!code) return

    const target = document.getElementById(`modelo-${code}`)
    if (!target) {
      pendingScrollModelCode = null
      return
    }

    const scroller = target.closest('main')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let removeTimeout: number | undefined

    const frame = window.requestAnimationFrame(() => {
      pendingScrollModelCode = null
      if (scroller) {
        const targetRect = target.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        const top =
          scroller.scrollTop +
          (targetRect.top - scrollerRect.top) -
          (scroller.clientHeight - targetRect.height) / 2
        scroller.scrollTo({
          top: Math.max(0, top),
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
      }
      target.classList.add('guide-card-flash')
      removeTimeout = window.setTimeout(
        () => target.classList.remove('guide-card-flash'),
        2200
      )
    })

    return () => {
      window.cancelAnimationFrame(frame)
      if (removeTimeout !== undefined) window.clearTimeout(removeTimeout)
      target.classList.remove('guide-card-flash')
    }
  }, [])

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
          <Link href="/guias">
            <ArrowLeft className="size-4" aria-hidden />
            <span className="ml-2">{guias.detail.backToHub}</span>
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
