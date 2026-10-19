'use client'

import type { ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { facturacion } from '@/content/facturacion'
import type { Quarter } from '@/src/modules/facturacion/domain/periods'
import { resetInvoicing } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { FacturacionProvider, useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { useHydrated } from '@/src/modules/facturacion/ui/use-hydrated'
import { PortalPageSkeletonBody } from '@/src/modules/portal/ui/skeletons'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

const QUARTERS: Quarter[] = [1, 2, 3, 4]
const copy = facturacion

/**
 * Filtro de periodo (año y trimestre) de las vistas con cifras por periodo (Panel y Facturas). Queda fijo
 * arriba al desplazarse, a todo el ancho de la zona de contenido, para no perderlo en listas largas.
 */
export function PeriodBar() {
  const { section, nested, year, setYear, years, quarter, setQuarter } = useFacturacion()

  if (!section.usesPeriod || nested) return null

  return (
    <div
      role="group"
      aria-label={copy.period.label}
      className="sticky top-0 z-20 -mx-4 flex items-center gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur sm:-mx-10 sm:px-10 dark:border-border/60"
    >
      <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
        <SelectTrigger aria-label={copy.period.year} className="h-9 w-28 shrink-0 rounded-md border border-border bg-field px-3 text-sm shadow-xs">
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
      {section.usesQuarter ? (
        <>
          <PortalFilterChip label={copy.period.wholeYear} active={quarter === null} onClick={() => setQuarter(null)} />
          {QUARTERS.map((value) => (
            <PortalFilterChip
              key={value}
              label={copy.period.quarter(value)}
              active={quarter === value}
              onClick={() => setQuarter(value)}
            />
          ))}
        </>
      ) : null}
    </div>
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
export function FacturacionShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated()

  return (
    <FacturacionProvider>
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
