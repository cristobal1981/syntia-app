'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, CalendarClock, Users } from 'lucide-react'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { Button } from '@/components/ui/button'
import { fiscalModelSources, fiscalModelsGuide } from '@/content/fiscal-models-guide'
import { guias } from '@/content/guias'
import { cn } from '@/lib/utils'
import { PortalSearchToolbar } from '@/src/modules/portal/ui/portal-search-toolbar'
import { getGuidesForModelCode } from '@/src/modules/guias/domain/guide-search'
import {
  fiscalModelMatchesQuery,
  formatKeywordHashtag,
  getSortedFiscalModelGuideEntries,
  normalizeGuideSearchText,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import type { FiscalModelGuideEntry } from '@/content/fiscal-models-guide'

type FiscalModelSourceLineProps = {
  authority: FiscalModelGuideEntry['authority']
  className?: string
}

/**
 * El IGIC (415/417/420/421/425) lo administra la Agencia Tributaria Canaria
 * (ATC), no la AEAT — enlazar siempre a la sede de la AEAT llevaría a esos
 * clientes al portal equivocado. La fuente se resuelve por modelo.
 */
function FiscalModelSourceLine({ authority, className }: FiscalModelSourceLineProps) {
  const source = fiscalModelSources[authority]
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground',
        className
      )}
    >
      <AppLink href={source.url} className={cn('text-xs', appLinkPortalClassName)}>
        {source.label}
      </AppLink>
      <span aria-hidden>·</span>
      <span>{fiscalModelsGuide.lastReviewedLabel}</span>
    </div>
  )
}

type FiscalModelIndexItemProps = {
  entry: FiscalModelGuideEntry
  active: boolean
  onSelect: (code: string) => void
}

function FiscalModelIndexItem({ entry, active, onSelect }: FiscalModelIndexItemProps) {
  return (
    <button
      type="button"
      data-model-code={entry.code}
      onClick={() => onSelect(entry.code)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/10 font-medium text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold tabular-nums text-foreground dark:bg-primary/20 dark:text-primary">
        {entry.code}
      </span>
      <span className="truncate">{entry.title}</span>
    </button>
  )
}

type FiscalModelKeywordsProps = {
  entry: FiscalModelGuideEntry
  searchQuery: string
  onKeywordClick: (keyword: string) => void
}

function FiscalModelKeywords({ entry, searchQuery, onKeywordClick }: FiscalModelKeywordsProps) {
  if (!entry.tags.length) return null
  const activeQuery = normalizeGuideSearchText(searchQuery)

  return (
    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Palabras clave">
      {entry.tags.map((tag) => {
        const isActive =
          activeQuery.length > 0 && normalizeGuideSearchText(tag).includes(activeQuery)

        return (
          <li key={tag}>
            <button
              type="button"
              onClick={() => onKeywordClick(tag)}
              className={cn(
                'inline-flex min-h-7 cursor-pointer items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'border-primary bg-primary/10 text-foreground hover:bg-primary/15 dark:border-primary/55 dark:bg-primary/28 dark:text-primary dark:hover:bg-primary/35'
                  : 'border-foreground/15 bg-foreground/[0.06] text-foreground hover:border-primary/40 hover:bg-primary/5 dark:border-border dark:bg-input/40 dark:text-foreground dark:hover:border-primary/40 dark:hover:bg-primary/15'
              )}
            >
              {formatKeywordHashtag(tag)}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

type FiscalModelDetailProps = {
  entry: FiscalModelGuideEntry
  searchQuery: string
  onKeywordClick: (keyword: string) => void
}

/** Quién debe presentarlo / plazo — piloto, solo algunos modelos lo tienen todavía. */
function FiscalModelFilingInfo({ entry }: { entry: FiscalModelGuideEntry }) {
  if (!entry.whoFiles && !entry.deadline) return null

  return (
    <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {entry.whoFiles ? (
        <div>
          <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Users className="size-3.5" aria-hidden />
            Quién debe presentarlo
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-foreground">{entry.whoFiles}</dd>
        </div>
      ) : null}
      {entry.deadline ? (
        <div>
          <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <CalendarClock className="size-3.5" aria-hidden />
            Plazo de presentación
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-foreground">{entry.deadline}</dd>
        </div>
      ) : null}
    </dl>
  )
}

/** Guías que mencionan este modelo, si las hay (no todos los modelos tienen). */
function FiscalModelRelatedGuides({ code }: { code: string }) {
  const relatedGuides = useMemo(() => getGuidesForModelCode(code), [code])
  if (!relatedGuides.length) return null

  return (
    <div className="mt-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <BookOpen className="size-3.5" aria-hidden />
        Guías relacionadas
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {relatedGuides.map((guide) => (
          <li key={guide.slug}>
            <AppLink
              href={`/guias/${guide.slug}`}
              className={cn('text-sm', appLinkPortalClassName)}
            >
              {guide.title}
            </AppLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Ficha de un modelo dentro del panel de detalle (desktop, maestro-detalle). */
function FiscalModelDetailPane({ entry, searchQuery, onKeywordClick }: FiscalModelDetailProps) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <span
          className="flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-white dark:bg-primary/15 dark:text-primary"
          aria-hidden
        >
          <span className="font-sans text-xl font-bold tabular-nums">{entry.code}</span>
        </span>
        <h2 className="min-w-0 flex-1 truncate pt-1.5 font-sans text-lg font-semibold text-foreground">
          <span className="sr-only">{entry.label}. </span>
          {entry.title}
        </h2>
      </div>
      <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
        {entry.description}
      </p>
      <FiscalModelFilingInfo entry={entry} />
      <FiscalModelRelatedGuides code={entry.code} />
      <FiscalModelKeywords entry={entry} searchQuery={searchQuery} onKeywordClick={onKeywordClick} />
    </div>
  )
}

export function FiscalModelsGuideView() {
  const copy = fiscalModelsGuide
  const [query, setQuery] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  // Solo se usa en móvil: el maestro-detalle de desktop siempre muestra
  // índice + panel a la vez, pero en una pantalla estrecha son dos vistas
  // separadas (lista o ficha), no dos columnas.
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const indexRef = useRef<HTMLDivElement>(null)

  const trimmedQuery = query.trim()

  const visibleModels = useMemo(() => {
    const entries = getSortedFiscalModelGuideEntries()
    if (!trimmedQuery) return entries
    return entries.filter((entry) => fiscalModelMatchesQuery(entry, trimmedQuery))
  }, [trimmedQuery])

  // Al llegar con ?modelo=<código> (desde una guía), preselecciona esa
  // ficha en vez del primer modelo de la lista.
  useEffect(() => {
    const paramCode = new URLSearchParams(window.location.search).get('modelo')
    if (paramCode) {
      const url = new URL(window.location.href)
      url.searchParams.delete('modelo')
      window.history.replaceState(null, '', url)
      setSelectedCode(paramCode)
      setMobileShowDetail(true)
    }
  }, [])

  // Si el modelo seleccionado no está en los resultados filtrados (o no hay
  // selección todavía), se usa el primero de la lista visible sin necesidad
  // de un efecto: es un valor derivado, no estado que sincronizar.
  const effectiveSelectedCode =
    selectedCode && visibleModels.some((entry) => entry.code === selectedCode)
      ? selectedCode
      : (visibleModels[0]?.code ?? null)

  // Si la selección llega por deep-link (o cambia por teclado/búsqueda) y el
  // ítem correspondiente del índice no está a la vista, lo trae al viewport
  // del propio panel — sin afectar el scroll de la página.
  useEffect(() => {
    if (!effectiveSelectedCode) return
    const container = indexRef.current
    const item = container?.querySelector<HTMLElement>(
      `[data-model-code="${effectiveSelectedCode}"]`
    )
    if (!container || !item) return

    // scrollIntoView desplaza también los ancestros con overflow (el <main>
    // del portal), aunque el ítem ya quepa en el panel — se calcula el
    // offset a mano para tocar solo el scroll del propio panel de índice.
    const itemTop = item.offsetTop
    const itemBottom = itemTop + item.offsetHeight
    const visibleTop = container.scrollTop
    const visibleBottom = visibleTop + container.clientHeight

    if (itemTop < visibleTop) {
      container.scrollTop = itemTop
    } else if (itemBottom > visibleBottom) {
      container.scrollTop = itemBottom - container.clientHeight
    }
  }, [effectiveSelectedCode])

  const selectedEntry =
    visibleModels.find((entry) => entry.code === effectiveSelectedCode) ?? null

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Button type="button" variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/guias">
            <ArrowLeft className="size-4" aria-hidden />
            <span className="ml-2">{guias.detail.backToHub}</span>
          </Link>
        </Button>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {copy.title}
        </h1>
      </header>

      <div>
        <PortalSearchToolbar
          searchId="fiscal-models-guide-search"
          searchLabel={copy.searchLabel}
          searchPlaceholder={copy.searchPlaceholder}
          query={query}
          onQueryChange={setQuery}
          clearLabel={copy.clearSearch}
        />
        {trimmedQuery ? (
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {visibleModels.length === 1
              ? copy.resultCountOne
              : copy.resultCountMany.replace('{count}', String(visibleModels.length))}
          </p>
        ) : null}
      </div>

      {visibleModels.length ? (
        <>
          {/* Desktop: maestro-detalle con altura fija a la pantalla. */}
          <div className="hidden md:flex md:h-[calc(100vh-24.5rem)] md:min-h-[420px] md:gap-6">
            <div
              ref={indexRef}
              className="portal-home-card w-[280px] shrink-0 overflow-y-auto rounded-xl p-2"
              aria-label="Índice de modelos"
            >
              <nav className="flex flex-col gap-0.5">
                {visibleModels.map((entry) => (
                  <FiscalModelIndexItem
                    key={entry.code}
                    entry={entry}
                    active={effectiveSelectedCode === entry.code}
                    onSelect={setSelectedCode}
                  />
                ))}
              </nav>
            </div>

            <div className="portal-home-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
              <div className="flex-1 overflow-y-auto p-6">
                {selectedEntry ? (
                  <FiscalModelDetailPane
                    entry={selectedEntry}
                    searchQuery={query}
                    onKeywordClick={setQuery}
                  />
                ) : null}
              </div>
              {selectedEntry ? (
                <FiscalModelSourceLine
                  authority={selectedEntry.authority}
                  className="border-t border-border/60 px-6 py-3"
                />
              ) : null}
            </div>
          </div>

          {/* Móvil: lista o ficha, nunca las dos a la vez. */}
          <div className="md:hidden">
            {mobileShowDetail && selectedEntry ? (
              <div className="portal-home-card flex flex-col overflow-hidden rounded-xl">
                <div className="border-b border-border/60 p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileShowDetail(false)}
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    <span className="ml-2">Volver a la lista</span>
                  </Button>
                </div>
                <div className="p-4">
                  <FiscalModelDetailPane
                    entry={selectedEntry}
                    searchQuery={query}
                    onKeywordClick={setQuery}
                  />
                </div>
                <FiscalModelSourceLine
                  authority={selectedEntry.authority}
                  className="border-t border-border/60 px-4 py-3"
                />
              </div>
            ) : (
              <div className="portal-home-card rounded-xl p-2">
                <nav className="flex flex-col gap-0.5">
                  {visibleModels.map((entry) => (
                    <FiscalModelIndexItem
                      key={entry.code}
                      entry={entry}
                      active={effectiveSelectedCode === entry.code}
                      onSelect={(code) => {
                        setSelectedCode(code)
                        setMobileShowDetail(true)
                      }}
                    />
                  ))}
                </nav>
              </div>
            )}
          </div>
        </>
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
