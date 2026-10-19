'use client'

import type { ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import type { Quarter } from '@/src/modules/facturacion/domain/periods'
import { resetInvoicing } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { FacturacionProvider, useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import { TramiteDrawerSelect } from '@/src/modules/tramites/ui/tramite-drawer-field'

const QUARTERS: Quarter[] = [1, 2, 3, 4]
const copy = facturacion

function PeriodBar() {
  const { section, nested, year, setYear, years, quarter, setQuarter } = useFacturacion()

  if (!section.usesPeriod || nested) return null

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <TramiteDrawerSelect
            id="facturacion-year"
            name="year"
            label={copy.period.year}
            placeholder=""
            value={String(year)}
            options={Object.fromEntries(years.map((value) => [String(value), String(value)]))}
            onChange={(value) => setYear(Number(value))}
          />
        </div>
        {section.usesQuarter ? (
          <div className="flex flex-wrap gap-2">
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
        ) : null}
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
export function FacturacionShell({ children }: { children: ReactNode }) {
  return (
    <FacturacionProvider>
      <div className="flex flex-col gap-6">
        <Header />
        <PeriodBar />
        {children}
      </div>
    </FacturacionProvider>
  )
}
