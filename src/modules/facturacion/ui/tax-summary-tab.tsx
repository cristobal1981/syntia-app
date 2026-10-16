'use client'

import { useMemo } from 'react'

import { facturacion } from '@/content/facturacion'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { buildYearTaxSummary } from '@/src/modules/facturacion/domain/tax-summary'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import { BookHeading, BookTable } from '@/src/modules/facturacion/ui/book-table'

const copy = facturacion.books.summary

const REGIME_NAME = { igic: 'IGIC', iva: 'IVA' } as const

export function TaxSummaryTab({ invoices, year }: { invoices: Invoice[]; year: number }) {
  const summary = useMemo(() => buildYearTaxSummary(invoices, year), [invoices, year])
  const total = (pick: (quarter: (typeof summary)[number]) => number) =>
    summary.reduce((sum, quarter) => sum + pick(quarter), 0)
  const quarterLabel = (quarter: number) => facturacion.period.quarter(quarter)

  const taxRows = summary.flatMap((quarter) =>
    quarter.indirectTaxes.map((tax) => ({ quarter: quarter.quarter, tax }))
  )

  return (
    <div className="flex flex-col gap-6">
      <BookHeading title={copy.title} description={copy.description} />

      <BookTable
        caption={`${copy.title} ${year}`}
        emptyMessage={facturacion.books.empty}
        columns={[
          { key: 'quarter', label: copy.columns.quarter },
          { key: 'income', label: copy.columns.income, align: 'right' },
          { key: 'expenses', label: copy.columns.expenses, align: 'right' },
          { key: 'net', label: copy.columns.net, align: 'right' },
          { key: 'fractional', label: copy.columns.fractional, align: 'right' },
        ]}
        rows={summary.map((quarter) => ({
          key: String(quarter.quarter),
          cells: [
            quarterLabel(quarter.quarter),
            formatCents(quarter.incomeCents),
            formatCents(quarter.expenseCents),
            formatCents(quarter.netCents),
            formatCents(quarter.fractionalPaymentCents),
          ],
        }))}
        footer={[
          facturacion.books.totals,
          formatCents(total((q) => q.incomeCents)),
          formatCents(total((q) => q.expenseCents)),
          formatCents(total((q) => q.netCents)),
          formatCents(total((q) => q.fractionalPaymentCents)),
        ]}
      />
      <p className="-mt-3 text-xs text-muted-foreground">{copy.fractionalNote}</p>

      {taxRows.length > 0 ? (
        <section className="flex flex-col gap-3">
          {[...new Set(taxRows.map((row) => row.tax.regime))].map((regime) => {
            const rows = taxRows.filter((row) => row.tax.regime === regime)
            return (
              <div key={regime} className="flex flex-col gap-2">
                <h3 className="font-sans text-base font-semibold text-foreground">
                  {copy.indirect.title(rows[0].tax.model, REGIME_NAME[regime])}
                </h3>
                <BookTable
                  caption={copy.indirect.title(rows[0].tax.model, REGIME_NAME[regime])}
                  emptyMessage={facturacion.books.empty}
                  columns={[
                    { key: 'quarter', label: copy.columns.quarter },
                    { key: 'charged', label: copy.indirect.charged, align: 'right' },
                    { key: 'deductible', label: copy.indirect.deductible, align: 'right' },
                    { key: 'result', label: copy.indirect.result, align: 'right' },
                    { key: 'kind', label: '' },
                  ]}
                  rows={rows.map(({ quarter, tax }) => ({
                    key: `${regime}-${quarter}`,
                    cells: [
                      quarterLabel(quarter),
                      formatCents(tax.chargedCents),
                      formatCents(tax.deductibleCents),
                      formatCents(tax.resultCents),
                      tax.resultCents >= 0 ? copy.indirect.toPay : copy.indirect.toCompensate,
                    ],
                  }))}
                />
              </div>
            )
          })}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-base font-semibold text-foreground">{copy.withholdings.title}</h3>
        <BookTable
          caption={copy.withholdings.title}
          emptyMessage={facturacion.books.empty}
          columns={[
            { key: 'quarter', label: copy.columns.quarter },
            { key: 'suffered', label: copy.withholdings.suffered, align: 'right' },
            { key: 'applied', label: copy.withholdings.applied, align: 'right' },
          ]}
          rows={summary.map((quarter) => ({
            key: String(quarter.quarter),
            cells: [
              quarterLabel(quarter.quarter),
              formatCents(quarter.withholdingsSufferedCents),
              formatCents(quarter.withholdingsAppliedCents),
            ],
          }))}
        />
      </section>

      <p className="text-xs text-muted-foreground">{copy.disclaimer}</p>
    </div>
  )
}
