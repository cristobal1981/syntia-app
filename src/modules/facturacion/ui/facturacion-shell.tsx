'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { FlaskConical, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { facturacion } from '@/content/facturacion'
import { cn } from '@/lib/utils'
import type { Issuer } from '@/src/modules/facturacion/domain/issuer'
import type { Quarter } from '@/src/modules/facturacion/domain/periods'
import { sectionHref } from '@/src/modules/facturacion/domain/sections'
import { resetInvoicing } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { FacturacionProvider, useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { useHydrated } from '@/src/modules/facturacion/ui/use-hydrated'
import { PortalPageSkeletonBody } from '@/src/modules/portal/ui/skeletons'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

const QUARTERS: Quarter[] = [1, 2, 3, 4]
const NEW_INVOICE_HREF = sectionHref({ slug: 'facturas/nueva' })
const copy = facturacion

/** `true` cuando el elemento fijo ya se ha pegado arriba: entonces, y solo entonces, lleva línea inferior. */
function useStuck() {
  const sentinel = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const node = sentinel.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { sentinel, stuck }
}

const TRIGGER_CLASS = 'h-11 rounded-md border border-border bg-field px-3 text-base shadow-xs md:h-9 md:text-sm'

/**
 * Barra de Panel y Facturas: a la izquierda el periodo, a la derecha la acción principal de la sección.
 * En móvil es una fila normal (dos selectores y un «+», sin ocupar pantalla al desplazarse); desde `md`
 * se fija arriba con los trimestres como chips y el botón con texto. El contenedor que se desplaza tiene
 * relleno (`p-10`) y un elemento fijo se pega al borde del relleno, no al borde exterior: `-top-10` lo compensa.
 * Desde lg, además, queda por debajo de la esquina redondeada invertida del topbar.
 */
export function PeriodBar() {
  const { section, nested, year, setYear, years, quarter, setQuarter } = useFacturacion()
  const { sentinel, stuck } = useStuck()

  if (!section.usesPeriod || nested) return null

  const yearSelect = (
    <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
      <SelectTrigger aria-label={copy.period.year} className={cn(TRIGGER_CLASS, 'w-28 shrink-0')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((value) => (
          <SelectItem key={value} value={String(value)}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <>
      <div ref={sentinel} aria-hidden className="-mb-6 h-px" />
      <div
        role="group"
        aria-label={copy.period.label}
        className={cn(
          'flex items-center gap-2 md:sticky md:z-20 md:-mx-10 md:gap-3 md:bg-background/95 md:px-10 md:py-2.5 md:backdrop-blur md:transition-shadow',
          // Desde md el topbar dibuja una esquina cóncava de `--radius-xl` sobre el contenido: la barra se pega justo
          // debajo de ella y una franja con su mismo fondo (que no cubre la esquina) tapa el hueco de encima.
          // La franja de encima ya aporta `--radius-xl` de aire: la barra no suma relleno arriba y baja el mismo valor,
          // para que el espacio sobre y bajo los controles sea igual.
          'md:top-[calc(var(--radius-xl)-2.5rem)] md:pt-0 md:pb-[var(--radius-xl)] md:before:absolute md:before:bottom-full md:before:left-[var(--radius-xl)] md:before:right-0 md:before:h-[var(--radius-xl)] md:before:bg-background/95',
          stuck && 'md:shadow-[0_1px_0_0_var(--border)]'
        )}
      >
        {yearSelect}
        {section.usesQuarter ? (
          <>
            <Select
              value={quarter === null ? 'all' : String(quarter)}
              onValueChange={(value) => setQuarter(value === 'all' ? null : (Number(value) as Quarter))}
            >
              <SelectTrigger aria-label={copy.period.quarterLabel} className={cn(TRIGGER_CLASS, 'min-w-0 flex-1 md:hidden')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.period.wholeYear}</SelectItem>
                {QUARTERS.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {copy.period.quarter(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto md:flex">
              <PortalFilterChip label={copy.period.wholeYear} active={quarter === null} onClick={() => setQuarter(null)} />
              {QUARTERS.map((value) => (
                <PortalFilterChip
                  key={value}
                  label={copy.period.quarter(value)}
                  active={quarter === value}
                  onClick={() => setQuarter(value)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}
        <Button asChild size="sm" className="size-11 shrink-0 px-0 md:h-8 md:w-auto md:px-3 md:has-[>svg]:px-2.5">
          <Link href={NEW_INVOICE_HREF} aria-label={copy.page.newInvoice}>
            <Plus aria-hidden />
            <span className="hidden md:inline">{copy.page.newInvoice}</span>
          </Link>
        </Button>
      </div>
    </>
  )
}

function Header() {
  const { section, nested } = useFacturacion()

  return (
    <header className="flex flex-col gap-4">
      {nested ? null : (
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {section.id === 'panel' ? copy.title : copy.tabs[section.id]}
          </h1>
          {section.id === 'panel' ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
          ) : null}
        </div>
      )}

      <div
        role="note"
        className="flex flex-wrap items-start gap-3 rounded-lg border border-service-fiscal/40 bg-service-fiscal/10 px-4 py-3 text-sm"
      >
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{copy.mockNotice.title}</p>
          <p className="mt-0.5 text-muted-foreground">{copy.mockNotice.description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetInvoicing()
            toast.success(copy.mockNotice.resetDone)
          }}
        >
          {copy.mockNotice.reset}
        </Button>
      </div>
    </header>
  )
}

/** Marco común de todas las secciones: cabecera, menú, periodo y cifras clave. */
export function FacturacionShell({ children, odooIssuer = null }: { children: ReactNode; odooIssuer?: Issuer | null }) {
  const hydrated = useHydrated()

  return (
    <FacturacionProvider odooIssuer={odooIssuer}>
      <div className="flex flex-col gap-6">
        <Header />
        {hydrated ? (
          <>
            <PeriodBar />
            {children}
          </>
        ) : (
          <PortalPageSkeletonBody />
        )}
      </div>
    </FacturacionProvider>
  )
}
