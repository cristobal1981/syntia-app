'use client'

import { useMemo } from 'react'

import { facturacion } from '@/content/facturacion'
import { buildBalanceSheet, buildProfitAndLoss, type ReportLine } from '@/src/modules/facturacion/domain/financial-reports'
import { buildJournal } from '@/src/modules/facturacion/domain/journal'
import { buildLedger } from '@/src/modules/facturacion/domain/ledger'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import { BookHeading, BookTable } from '@/src/modules/facturacion/ui/book-table'

function lineRows(lines: ReportLine[]) {
  return lines.map((line) => ({
    key: line.account,
    cells: [line.account, line.accountName, formatCents(line.amountCents)],
  }))
}

export function ProfitAndLossTab({ invoices }: { invoices: Invoice[] }) {
  const report = useMemo(() => buildProfitAndLoss(buildLedger(buildJournal(invoices))), [invoices])
  const text = facturacion.reports.profitLoss
  const columns = [
    { key: 'account', label: text.columns.account },
    { key: 'name', label: text.columns.name },
    { key: 'amount', label: text.columns.amount, align: 'right' as const },
  ]

  return (
    <div className="flex flex-col gap-6">
      <BookHeading title={text.title} description={text.description} />
      <section className="flex flex-col gap-2" aria-label={text.income}>
        <h3 className="font-sans text-base font-semibold text-foreground">{text.income}</h3>
        <BookTable
          caption={text.income}
          emptyMessage={facturacion.books.empty}
          columns={columns}
          rows={lineRows(report.income)}
          footer={['', text.income, formatCents(report.incomeCents)]}
        />
      </section>
      <section className="flex flex-col gap-2" aria-label={text.expenses}>
        <h3 className="font-sans text-base font-semibold text-foreground">{text.expenses}</h3>
        <BookTable
          caption={text.expenses}
          emptyMessage={facturacion.books.empty}
          columns={columns}
          rows={lineRows(report.expenses)}
          footer={['', text.expenses, formatCents(report.expenseCents)]}
        />
      </section>
      <p className="portal-home-card flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold text-foreground">
        <span>{text.result}</span>
        <span className="tabular-nums">{formatCents(report.resultCents)}</span>
      </p>
    </div>
  )
}

export function BalanceSheetTab({ invoices }: { invoices: Invoice[] }) {
  const sheet = useMemo(() => buildBalanceSheet(buildLedger(buildJournal(invoices))), [invoices])
  const text = facturacion.reports.balance
  const columns = [
    { key: 'account', label: text.columns.account },
    { key: 'name', label: text.columns.name },
    { key: 'amount', label: text.columns.amount, align: 'right' as const },
  ]

  return (
    <div className="flex flex-col gap-6">
      <BookHeading title={text.title} description={text.description} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2" aria-label={text.assets}>
          <h3 className="font-sans text-base font-semibold text-foreground">{text.assets}</h3>
          <BookTable
            caption={text.assets}
            emptyMessage={facturacion.books.empty}
            columns={columns}
            rows={lineRows(sheet.assets)}
            footer={['', text.totalAssets, formatCents(sheet.assetsCents)]}
          />
        </section>
        <section className="flex flex-col gap-2" aria-label={text.liabilities}>
          <h3 className="font-sans text-base font-semibold text-foreground">
            {text.liabilities} y {text.equity.toLowerCase()}
          </h3>
          <BookTable
            caption={text.liabilities}
            emptyMessage={facturacion.books.empty}
            columns={columns}
            rows={[
              ...lineRows(sheet.liabilities),
              ...(sheet.assets.length + sheet.liabilities.length > 0
                ? [{ key: 'result', cells: ['', `${text.equity}: ${text.resultLine}`, formatCents(sheet.resultCents)] }]
                : []),
            ]}
            footer={['', text.totalLiabilities, formatCents(sheet.liabilitiesAndEquityCents)]}
          />
        </section>
      </div>
    </div>
  )
}
