'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { portal } from '@/content/portal'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { cn } from '@/lib/utils'
import { isClientOrWorkerRole, type PortalRole } from '@/src/modules/auth/domain/types'
import {
  buildPortalSearchActions,
  buildPortalSearchIndex,
} from '@/src/modules/portal/application/build-portal-search-index'
import {
  filterPortalSearchItems,
  getPortalSearchSuggestions,
} from '@/src/modules/portal/application/filter-portal-search'
import type { PortalSearchItem } from '@/src/modules/portal/domain/portal-search-types'
import type { NavItem } from '@/src/modules/portal/domain/types'
import type { ProcedureTicketType } from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  formatPortalShortcutLabel,
  PORTAL_SEARCH_SHORTCUT,
} from '@/src/modules/portal/domain/portal-shortcuts'
import { useOnboardingChecklistOptional } from '@/src/modules/portal/ui/onboarding-checklist-context'
import { usePortalCreateConsultaOptional } from '@/src/modules/portal/ui/portal-create-consulta-context'
import { PortalNavIcon } from '@/src/modules/portal/ui/portal-nav-icon'
import { PortalShortcutHint } from '@/src/modules/portal/ui/portal-shortcut-hint'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

type PortalTopBarSearchProps = {
  role: PortalRole
  navItems: NavItem[]
  className?: string
  onNavigate?: (href: string) => void
}

function collectNavHrefs(items: NavItem[]): Set<string> {
  const hrefs = new Set<string>()
  for (const item of items) {
    if (item.href) hrefs.add(item.href)
    for (const child of item.children ?? []) {
      if (child.href) hrefs.add(child.href)
    }
  }
  return hrefs
}

const PROCEDURE_SEARCH_ACTIONS: Array<{
  id: string
  procedure: ProcedureTicketType
  label: string
  description: string
  keywords: string[]
}> = [
  {
    id: 'action:procedure:alta-trabajador',
    procedure: 'alta-trabajador',
    label: tramiteSolicitudes.picker.altaTrabajador.label,
    description: tramiteSolicitudes.picker.altaTrabajador.description,
    keywords: ['alta', 'trabajador', 'empleado', 'contrato', 'contratación'],
  },
  {
    id: 'action:procedure:baja-trabajador',
    procedure: 'baja-trabajador',
    label: tramiteSolicitudes.picker.bajaTrabajador.label,
    description: tramiteSolicitudes.picker.bajaTrabajador.description,
    keywords: ['baja', 'trabajador', 'empleado', 'dimisión', 'despido'],
  },
  {
    id: 'action:procedure:carta-vacaciones',
    procedure: 'carta-vacaciones',
    label: tramiteSolicitudes.picker.cartaVacaciones.label,
    description: tramiteSolicitudes.picker.cartaVacaciones.description,
    keywords: ['vacaciones', 'carta', 'descanso', 'festivos'],
  },
]

function procedureActionMatchesQuery(query: string, keywords: string[]): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return false
  return keywords.some(
    (keyword) =>
      keyword.includes(normalized) || normalized.includes(keyword)
  )
}

function SearchResultsList({
  listboxId,
  visibleItems,
  activeIndex,
  sectionTitle,
  showActionsHeading,
  pageItems,
  actionItems,
  onActiveIndexChange,
  onSelect,
}: {
  listboxId: string
  visibleItems: PortalSearchItem[]
  activeIndex: number
  sectionTitle: string
  showActionsHeading: boolean
  pageItems: PortalSearchItem[]
  actionItems: PortalSearchItem[]
  onActiveIndexChange: (index: number) => void
  onSelect: (item: PortalSearchItem) => void
}) {
  if (visibleItems.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {portal.search.emptyTitle}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {portal.search.emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="max-h-[min(24rem,50dvh)] overflow-y-auto py-2">
      {pageItems.length > 0 ? (
        <section>
          <p className="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {sectionTitle}
          </p>
          <ul id={listboxId} role="listbox" aria-label={sectionTitle}>
            {pageItems.map((item) => {
              const itemIndex = visibleItems.indexOf(item)
              const active = itemIndex === activeIndex

              return (
                <li key={item.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent/70'
                    )}
                    onMouseEnter={() => onActiveIndexChange(itemIndex)}
                    onClick={() => onSelect(item)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                      <PortalNavIcon
                        icon={item.icon}
                        className="size-4 text-muted-foreground"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {item.label}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {actionItems.length > 0 ? (
        <section
          className={
            pageItems.length > 0 ? 'mt-1 border-t border-border/70 pt-1' : undefined
          }
        >
          {showActionsHeading ? (
            <p className="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {portal.search.actionsTitle}
            </p>
          ) : null}
          <ul role="listbox" aria-label={portal.search.actionsTitle}>
            {actionItems.map((item) => {
              const itemIndex = visibleItems.indexOf(item)
              const active = itemIndex === activeIndex

              return (
                <li key={item.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent/70'
                    )}
                    onMouseEnter={() => onActiveIndexChange(itemIndex)}
                    onClick={() => onSelect(item)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                      <PortalNavIcon
                        icon={item.icon}
                        className="size-4 text-muted-foreground"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export function PortalTopBarSearch({
  role,
  navItems,
  className,
  onNavigate,
}: PortalTopBarSearchProps) {
  const router = useRouter()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const createConsulta = usePortalCreateConsultaOptional()
  const onboardingChecklist = useOnboardingChecklistOptional()
  const overlayActive = usePortalShortcutOverlay()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const allowedHrefs = useMemo(
    () => (role === 'worker' ? collectNavHrefs(navItems) : undefined),
    [navItems, role]
  )
  const index = useMemo(
    () => buildPortalSearchIndex(role, navItems, allowedHrefs),
    [allowedHrefs, navItems, role]
  )

  const createConsultaItem = useMemo<PortalSearchItem | null>(() => {
    if (!isClientOrWorkerRole(role) || !createConsulta?.isAvailable) return null

    return {
      id: 'action:create-consulta',
      kind: 'action',
      label: portal.search.actionCreateConsulta,
      icon: 'procedures',
      keywords: ['consulta', 'nueva', 'duda', 'soporte'],
    }
  }, [createConsulta?.isAvailable, role])

  const procedureActionItems = useMemo<PortalSearchItem[]>(() => {
    if (role !== 'client' || !createConsulta?.isAvailable) return []

    const trimmed = query.trim()
    if (!trimmed) return []

    return PROCEDURE_SEARCH_ACTIONS.filter((action) =>
      procedureActionMatchesQuery(trimmed, action.keywords)
    ).map((action) => ({
      id: action.id,
      kind: 'action' as const,
      label: action.label,
      description: action.description,
      icon: 'procedures' as const,
      keywords: action.keywords,
    }))
  }, [createConsulta?.isAvailable, query, role])

  const visibleItems = useMemo(() => {
    const trimmed = query.trim()
    const pages = trimmed
      ? filterPortalSearchItems(index, trimmed)
      : getPortalSearchSuggestions(index)

    const queryActions = buildPortalSearchActions(role, query, allowedHrefs)
    const quickActions =
      !trimmed && createConsultaItem ? [createConsultaItem] : queryActions

    return [...pages, ...procedureActionItems, ...quickActions]
  }, [allowedHrefs, createConsultaItem, index, procedureActionItems, query, role])

  const openSearch = useCallback(() => {
    setOpen(true)
    onboardingChecklist?.markStepComplete('buscador')
  }, [onboardingChecklist])

  usePortalShortcut(PORTAL_SEARCH_SHORTCUT, openSearch)

  // Ajuste durante el render (no en un efecto): vuelve al primer resultado
  // cuando cambia la búsqueda o el conjunto de resultados visibles.
  const [prevResetKey, setPrevResetKey] = useState([query, visibleItems.length])
  if (query !== prevResetKey[0] || visibleItems.length !== prevResetKey[1]) {
    setPrevResetKey([query, visibleItems.length])
    setActiveIndex(0)
  }

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const selectItem = useCallback(
    (item: PortalSearchItem) => {
      if (item.id === 'action:create-consulta') {
        createConsulta?.openCreateConsulta()
        close()
        return
      }

      if (item.id.startsWith('action:procedure:')) {
        const procedure = item.id.replace(
          'action:procedure:',
          ''
        ) as ProcedureTicketType
        if (procedure === 'alta-trabajador') {
          router.push('/alta-trabajador')
          close()
          return
        }
        createConsulta?.openCreateConsulta({ procedure })
        close()
        return
      }

      if (!item.href) return

      onNavigate?.(item.href)
      router.push(item.href)
      close()
    },
    [close, createConsulta, onNavigate, router]
  )

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!visibleItems.length) return
      setActiveIndex((value) => (value + 1) % visibleItems.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!visibleItems.length) return
      setActiveIndex((value) =>
        value === 0 ? visibleItems.length - 1 : value - 1
      )
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const item = visibleItems[activeIndex]
      if (item) selectItem(item)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const sectionTitle = query.trim()
    ? portal.search.resultsTitle
    : portal.search.suggestionsTitle
  const showActionsHeading =
    query.trim().length > 0 &&
    visibleItems.some((item) => item.kind === 'action')
  const pageItems = visibleItems.filter((item) => item.kind === 'page')
  const actionItems = visibleItems.filter((item) => item.kind === 'action')

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className={cn(
          'flex size-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-9 lg:h-8 lg:w-full lg:max-w-md lg:justify-start lg:rounded-md lg:border lg:border-border lg:bg-background lg:px-2.5 lg:text-sm lg:text-foreground lg:hover:bg-background lg:hover:border-border lg:hover:text-foreground dark:lg:border-border dark:lg:bg-sidebar-accent lg:max-w-lg',
          overlayActive && 'ring-2 ring-primary/35',
          className
        )}
        aria-label={portal.search.dialogTitle}
        aria-keyshortcuts={formatPortalShortcutLabel(PORTAL_SEARCH_SHORTCUT)}
        aria-haspopup="dialog"
      >
        <Search className="size-4 shrink-0 lg:size-3.5 lg:text-muted-foreground" aria-hidden />
        <span className="hidden min-w-0 flex-1 truncate text-left text-muted-foreground lg:block">
          {portal.shell.searchPlaceholder}
        </span>
        <span className="hidden lg:block">
          <PortalShortcutHint shortcut={PORTAL_SEARCH_SHORTCUT} />
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setOpen(true)
            return
          }
          close()
        }}
      >
        <DialogContent
          showCloseButton={false}
          // Anchored near the top below `sm`: centered (the shadcn default)
          // sits behind the mobile keyboard once it opens, since the layout
          // viewport `top-1/2` is measured against doesn't shrink for it on
          // most mobile browsers.
          className="top-4 translate-y-0 gap-0 overflow-hidden bg-background p-0 sm:top-1/2 sm:max-w-xl sm:-translate-y-1/2"
        >
          <DialogTitle className="sr-only">
            {portal.search.dialogTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {portal.search.dialogDescription}
          </DialogDescription>

          <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={portal.shell.searchPlaceholder}
              aria-label={portal.shell.searchPlaceholder}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-expanded={visibleItems.length > 0}
              role="combobox"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>

          <SearchResultsList
            listboxId={listboxId}
            visibleItems={visibleItems}
            activeIndex={activeIndex}
            sectionTitle={sectionTitle}
            showActionsHeading={showActionsHeading}
            pageItems={pageItems}
            actionItems={actionItems}
            onActiveIndexChange={setActiveIndex}
            onSelect={selectItem}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
