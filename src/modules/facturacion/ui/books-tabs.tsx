'use client'

import { useMemo, useState } from 'react'

import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import {
  buildIncomeExpenseBook,
  buildRegistryBook,
  expensesByCategory,
} from '@/src/modules/facturacion/domain/books'
import { buildJournal, entryTotals } from '@/src/modules/facturacion/domain/journal'
import { buildLedger, buildTrialBalance } from '@/src/modules/facturacion/domain/ledger'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import type { Invoice, InvoiceDirection } from '@/src/modules/facturacion/domain/types'
import { BookHeading, BookTable } from '@/src/modules/facturacion/ui/book-table'
import { InvoiceLink } from '@/src/modules/facturacion/ui/invoice-link'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

const copy = facturacion.books

function shortDate(iso: string): string {
  return formatIsoDateEs(iso)
}

function rateLabel(rate: number): string {
  return `${String(rate).replace('.', ',')} %`
}

export function RegistryBookTab({
  invoices,
  direction,
  invoiceHref,
}: {
  invoices: Invoice[]
  direction: InvoiceDirection
  invoiceHref?: (id: string) => string
}) {
  const book = useMemo(() => buildRegistryBook(invoices, direction), [invoices, direction])
  const text = direction === 'recibida' ? copy.registry.received : copy.registry.issued
  const columns = copy.registry.columns

  return (
    <div className="flex flex-col gap-4">
      <BookHeading title={text.title} description={text.description} />
      <BookTable
        caption={text.title}
        emptyMessage={copy.empty}
        columns={[
          { key: 'order', label: columns.order },
          { key: 'date', label: columns.date },
          { key: 'number', label: columns.number },
          { key: 'counterparty', label: columns.counterparty },
          { key: 'taxId', label: columns.taxId },
          { key: 'base', label: columns.base, align: 'right' },
          { key: 'rate', label: columns.rate, align: 'right' },
          { key: 'tax', label: columns.tax, align: 'right' },
          { key: 'withholding', label: columns.withholding, align: 'right' },
          { key: 'total', label: columns.total, align: 'right' },
        ]}
        rows={book.rows.map((row) => ({
          key: row.invoiceId,
          cells: [
            row.order,
            shortDate(row.date),
            <InvoiceLink key="n" href={invoiceHref?.(row.invoiceId)}>
              {row.invoiceNumber}
            </InvoiceLink>,
            row.counterpartyName,
            row.counterpartyTaxId,
            formatCents(row.baseCents),
            rateLabel(row.taxRate),
            formatCents(row.taxCents),
            formatCents(row.withholdingCents),
            formatCents(row.totalCents),
          ],
        }))}
        footer={[
          copy.totals,
          '',
          '',
          '',
          '',
          formatCents(book.baseCents),
          '',
          formatCents(book.taxCents),
          formatCents(book.withholdingCents),
          formatCents(book.totalCents),
        ]}
      />
    </div>
  )
}

type IncomeExpenseFilter = 'all' | 'emitida' | 'recibida'

export function IncomeExpenseTab({
  invoices,
  invoiceHref,
}: {
  invoices: Invoice[]
  invoiceHref?: (id: string) => string
}) {
  const [filter, setFilter] = useState<IncomeExpenseFilter>('all')
  const book = useMemo(() => buildIncomeExpenseBook(invoices), [invoices])
  const categories = useMemo(() => expensesByCategory(invoices), [invoices])
  const text = copy.incomeExpense
  const rows = book.rows.filter((row) => filter === 'all' || row.direction === filter)

  return (
    <div className="flex flex-col gap-4">
      <BookHeading title={text.title} description={text.description} />

      <div className="flex flex-wrap gap-2">
        <PortalFilterChip label={text.all} active={filter === 'all'} onClick={() => setFilter('all')} />
        <PortalFilterChip label={text.onlyIncome} active={filter === 'emitida'} onClick={() => setFilter('emitida')} />
        <PortalFilterChip label={text.onlyExpenses} active={filter === 'recibida'} onClick={() => setFilter('recibida')} />
      </div>

      <BookTable
        caption={text.title}
        emptyMessage={copy.empty}
        columns={[
          { key: 'date', label: text.columns.date },
          { key: 'number', label: text.columns.number },
          { key: 'counterparty', label: text.columns.counterparty },
          { key: 'category', label: text.columns.category },
          { key: 'income', label: text.columns.income, align: 'right' },
          { key: 'expense', label: text.columns.expense, align: 'right' },
          { key: 'running', label: text.columns.running, align: 'right' },
        ]}
        rows={rows.map((row) => ({
          key: row.invoiceId,
          cells: [
            shortDate(row.date),
            <InvoiceLink key="n" href={invoiceHref?.(row.invoiceId)}>
              {row.invoiceNumber}
            </InvoiceLink>,
            row.counterpartyName,
            row.categoryLabel,
            row.incomeCents ? formatCents(row.incomeCents) : '',
            row.expenseCents ? formatCents(row.expenseCents) : '',
            formatCents(row.runningResultCents),
          ],
        }))}
        footer={['', '', '', copy.totals, formatCents(book.incomeCents), formatCents(book.expenseCents), formatCents(book.resultCents)]}
      />

      {categories.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label={text.byCategory}>
          <h3 className="font-sans text-base font-semibold text-foreground">{text.byCategory}</h3>
          <BookTable
            caption={text.byCategory}
            emptyMessage={copy.empty}
            columns={[
              { key: 'category', label: text.columns.category },
              { key: 'expense', label: text.columns.expense, align: 'right' },
            ]}
            rows={categories.map((category) => ({
              key: category.categoryId,
              cells: [category.label, formatCents(category.expenseCents)],
            }))}
          />
        </section>
      ) : null}
    </div>
  )
}

export function JournalTab({ invoices }: { invoices: Invoice[] }) {
  const entries = useMemo(() => buildJournal(invoices), [invoices])
  const text = copy.journal

  return (
    <div className="flex flex-col gap-4">
      <BookHeading title={text.title} description={text.description} />
      {entries.length === 0 ? <BookTable caption={text.title} emptyMessage={copy.empty} columns={[]} rows={[]} /> : null}
      {entries.map((entry) => {
        const totals = entryTotals(entry)
        return (
          <section key={`${entry.invoiceId}-${entry.kind}`} className="flex flex-col gap-2">
            <h3 className="font-sans text-sm font-semibold text-foreground">
              {text.entry(entry.number)} · {shortDate(entry.date)}
              <span className="ml-2 font-normal text-muted-foreground">{entry.concept}</span>
            </h3>
            <BookTable
              caption={`${text.entry(entry.number)}: ${entry.concept}`}
              emptyMessage={copy.empty}
              columns={[
                { key: 'account', label: text.columns.account },
                { key: 'name', label: text.columns.name },
                { key: 'debit', label: text.columns.debit, align: 'right' },
                { key: 'credit', label: text.columns.credit, align: 'right' },
              ]}
              rows={entry.lines.map((line, index) => ({
                key: `${line.account}-${index}`,
                cells: [
                  line.account,
                  line.accountName,
                  line.debitCents ? formatCents(line.debitCents) : '',
                  line.creditCents ? formatCents(line.creditCents) : '',
                ],
              }))}
              footer={['', text.balanced, formatCents(totals.debitCents), formatCents(totals.creditCents)]}
            />
          </section>
        )
      })}
    </div>
  )
}

export function LedgerTab({ invoices }: { invoices: Invoice[] }) {
  const ledger = useMemo(() => buildLedger(buildJournal(invoices)), [invoices])
  const trialBalance = useMemo(() => buildTrialBalance(ledger), [ledger])
  const text = copy.ledger

  return (
    <div className="flex flex-col gap-4">
      <BookHeading title={text.title} description={text.description} />
      {ledger.length === 0 ? <BookTable caption={text.title} emptyMessage={copy.empty} columns={[]} rows={[]} /> : null}
      {ledger.map((account) => (
        <details key={account.account} className="group portal-home-card rounded-xl">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground">
            <span>
              {account.account} · {account.accountName}
            </span>
            <span className="tabular-nums text-muted-foreground">{formatCents(account.balanceCents)}</span>
          </summary>
          <div className="px-2 pb-3">
            <BookTable
              caption={`${account.account} ${account.accountName}`}
              emptyMessage={copy.empty}
              columns={[
                { key: 'date', label: text.columns.date },
                { key: 'entry', label: text.columns.entry, align: 'right' },
                { key: 'concept', label: text.columns.concept },
                { key: 'debit', label: text.columns.debit, align: 'right' },
                { key: 'credit', label: text.columns.credit, align: 'right' },
                { key: 'balance', label: text.columns.balance, align: 'right' },
              ]}
              rows={account.lines.map((line, index) => ({
                key: `${line.entryNumber}-${index}`,
                cells: [
                  shortDate(line.date),
                  line.entryNumber,
                  line.concept,
                  line.debitCents ? formatCents(line.debitCents) : '',
                  line.creditCents ? formatCents(line.creditCents) : '',
                  formatCents(line.balanceCents),
                ],
              }))}
              footer={['', '', copy.totals, formatCents(account.debitCents), formatCents(account.creditCents), formatCents(account.balanceCents)]}
            />
          </div>
        </details>
      ))}

      {trialBalance.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-sans text-base font-semibold text-foreground">{text.trialBalance}</h3>
          <BookTable
            caption={text.trialBalance}
            emptyMessage={copy.empty}
            columns={[
              { key: 'account', label: text.trialColumns.account },
              { key: 'name', label: text.trialColumns.name },
              { key: 'debit', label: text.trialColumns.debit, align: 'right' },
              { key: 'credit', label: text.trialColumns.credit, align: 'right' },
              { key: 'debtor', label: text.trialColumns.debtor, align: 'right' },
              { key: 'creditor', label: text.trialColumns.creditor, align: 'right' },
            ]}
            rows={trialBalance.map((row) => ({
              key: row.account,
              cells: [
                row.account,
                row.accountName,
                formatCents(row.debitCents),
                formatCents(row.creditCents),
                row.debtorBalanceCents ? formatCents(row.debtorBalanceCents) : '',
                row.creditorBalanceCents ? formatCents(row.creditorBalanceCents) : '',
              ],
            }))}
            footer={[
              '',
              copy.totals,
              formatCents(trialBalance.reduce((total, row) => total + row.debitCents, 0)),
              formatCents(trialBalance.reduce((total, row) => total + row.creditCents, 0)),
              formatCents(trialBalance.reduce((total, row) => total + row.debtorBalanceCents, 0)),
              formatCents(trialBalance.reduce((total, row) => total + row.creditorBalanceCents, 0)),
            ]}
          />
        </section>
      ) : null}
    </div>
  )
}
