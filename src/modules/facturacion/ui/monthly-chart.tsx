'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { niceCeilCents, type MonthlyPoint } from '@/src/modules/facturacion/domain/dashboard'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { BookTable } from '@/src/modules/facturacion/ui/book-table'

const copy = facturacion.dashboard.chart

/** Euros en compacto para el eje: 2.000 € → «2 k €». */
function axisLabel(cents: number): string {
  if (cents === 0) return '0 €'
  const euros = cents / 100
  return euros >= 1000 ? `${String(euros / 1000).replace('.', ',')} k €` : `${euros} €`
}

// Teal de marca, validado contra el fondo claro y el oscuro de la tarjeta (#003737).
const INCOME_BAR = 'bg-[#12a090]'
const PLOT_HEIGHT = 176

export function MonthlyChart({ series }: { series: MonthlyPoint[] }) {
  const [asTable, setAsTable] = useState(false)
  const [active, setActive] = useState<number | null>(null)

  const max = Math.max(...series.map((point) => point.incomeCents))
  const top = niceCeilCents(max)
  const hasData = max > 0
  const ticks = [top, top / 2, 0]
  const activePoint = active === null ? null : series[active]

  return (
    <section className="portal-home-card rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-base font-semibold text-foreground">{copy.title}</h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">{copy.description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setAsTable((value) => !value)}>
          {asTable ? copy.asChart : copy.asTable}
        </Button>
      </div>

      {asTable ? (
        <div className="mt-4">
          <BookTable
            caption={copy.title}
            emptyMessage={copy.empty}
            columns={[
              { key: 'month', label: copy.month },
              { key: 'income', label: copy.income, align: 'right' },
            ]}
            rows={series.map((point) => ({
              key: String(point.month),
              cells: [facturacion.months[point.month - 1], formatCents(point.incomeCents)],
            }))}
          />
        </div>
      ) : (
        <>
          {!hasData ? <p className="mt-6 text-sm text-muted-foreground">{copy.empty}</p> : null}

          <div className="relative mt-4 flex gap-2" style={{ height: PLOT_HEIGHT + 24 }}>
            <div
              className="flex w-12 shrink-0 flex-col justify-between text-right text-[11px] text-muted-foreground tabular-nums"
              style={{ height: PLOT_HEIGHT }}
              aria-hidden
            >
              {ticks.map((tick) => (
                <span key={tick} className="leading-none">
                  {axisLabel(tick)}
                </span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: PLOT_HEIGHT }} aria-hidden>
                {ticks.map((tick) => (
                  <div key={tick} className="h-px w-full bg-border/70 dark:bg-border/40" />
                ))}
              </div>

              <div className="relative grid grid-cols-12 gap-1">
                {series.map((point, index) => (
                  <button
                    key={point.month}
                    type="button"
                    className="group flex flex-col items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    aria-label={`${facturacion.months[index]}: ${copy.income} ${formatCents(point.incomeCents)}`}
                  >
                    <span className="flex items-end gap-0.5" style={{ height: PLOT_HEIGHT }}>
                      <span
                        className={`w-2 rounded-t-[4px] sm:w-3 ${INCOME_BAR} ${active === index ? 'opacity-100' : 'group-hover:opacity-90'}`}
                        style={{ height: `${(point.incomeCents / top) * 100}%` }}
                      />
                    </span>
                    <span className="mt-2 text-[11px] leading-none text-muted-foreground">
                      {facturacion.monthsShort[index]}
                    </span>
                  </button>
                ))}
              </div>

              {activePoint && active !== null ? (
                <div
                  role="status"
                  className="pointer-events-none absolute top-0 z-10 w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
                  style={{
                    left: `${((active + 0.5) / 12) * 100}%`,
                    transform: `translateX(${active < 3 ? '-10%' : active > 8 ? '-90%' : '-50%'})`,
                  }}
                >
                  <p className="font-semibold text-foreground">{facturacion.months[active]}</p>
                  <p className="mt-1 flex items-center justify-between gap-2 text-foreground">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className={`h-[3px] w-3 rounded-full ${INCOME_BAR}`} aria-hidden />
                      {copy.income}
                    </span>
                    <strong className="tabular-nums">{formatCents(activePoint.incomeCents)}</strong>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
