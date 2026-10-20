'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Receipt, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PortalEmptyState } from '@/components/ui/portal-empty-state'
import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import { invoiceMatchesQuery } from '@/src/modules/facturacion/domain/search'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { compareInvoices } from '@/src/modules/facturacion/domain/periods'
import { daysOverdue, paymentStatus, type PaymentStatus } from '@/src/modules/facturacion/domain/payment-status'
import { rectificationsOf } from '@/src/modules/facturacion/domain/rectification'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import { BookTable } from '@/src/modules/facturacion/ui/book-table'
import { InvoiceStatusPill } from '@/src/modules/facturacion/ui/invoice-badges'
import { InvoiceLink } from '@/src/modules/facturacion/ui/invoice-link'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import { NO_AUTOFILL } from '@/components/ui/no-autofill'

const copy = facturacion.invoices
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)

type StatusFilter = 'all' | PaymentStatus

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'pendiente', 'vencida', 'pagada']

type InvoicesTabProps = {
  /** Todas las del periodo, borradores incluidos. */
  invoices: Invoice[]
  /** Todas las facturas, para saber cuáles están rectificadas. */
  allInvoices: Invoice[]
  today: string
}

export function InvoicesTab({ invoices, allInvoices, today }: InvoicesTabProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const visible = useMemo(
    () =>
      invoices
        .filter(
          (invoice) =>
            (status === 'all' || (invoice.status === 'definitiva' && paymentStatus(invoice, today) === status)) &&
            invoiceMatchesQuery(invoice, query)
        )
        .sort((a, b) => compareInvoices(b, a)),
    [invoices, status, query, today]
  )

  const totals = useMemo(() => {
    // Las rectificativas restan: lo facturado es el neto de lo expedido.
    const issued = visible.filter((invoice) => invoice.status === 'definitiva')
    return {
      billedCents: issued.reduce((sum, invoice) => sum + invoice.totalCents, 0),
      pendingCents: issued
        .filter((invoice) => invoice.kind === 'ordinaria' && !invoice.paymentDate)
        .reduce((sum, invoice) => sum + invoice.totalCents, 0),
    }
  }, [visible])

  const actions = (
    <Button asChild>
      <Link href={`${invoicesHref}/nueva`}>
        <Plus aria-hidden />
        {facturacion.page.newInvoice}
      </Link>
    </Button>
  )

  if (invoices.length === 0) {
    return (
      <PortalEmptyState
        icon={Receipt}
        title={copy.empty.title}
        description={copy.empty.description}
        hint={allInvoices.length > 0 ? copy.empty.otherPeriods : undefined}
        action={actions}
      />
    )
  }

  const columns = copy.columns

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        {/* En móvil los estados hacen scroll en una sola línea en vez de ocupar varias filas. */}
        <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
          {STATUS_FILTERS.map((value) => (
            <PortalFilterChip key={value} label={copy.statusFilters[value]} active={status === value} onClick={() => setStatus(value)} />
          ))}
        </div>
        <Input
          {...NO_AUTOFILL}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchLabel}
          className="h-11 w-full text-base sm:ml-auto sm:h-9 sm:w-72 sm:text-sm"
        />
      </div>

      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {copy.summary.count(visible.length)}
        {totals.billedCents > 0 || totals.pendingCents > 0 ? (
          <>
            {' · '}
            {copy.summary.billed} <span className="font-medium text-foreground">{formatCents(totals.billedCents)}</span>
            {' · '}
            {copy.summary.pending} <span className="font-medium text-foreground">{formatCents(totals.pendingCents)}</span>
          </>
        ) : null}
      </p>

      {visible.length === 0 ? (
        <PortalEmptyState
          icon={SearchX}
          title={copy.noResults}
          description={copy.noResultsHint}
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery('')
                setStatus('all')
              }}
            >
              {copy.clearFilters}
            </Button>
          }
        />
      ) : null}

      {visible.length > 0 ? (
        <BookTable
          caption={facturacion.tabs.invoices}
          emptyMessage={copy.noResults}
          columns={[
            { key: 'date', label: columns.date },
            { key: 'number', label: columns.number },
            { key: 'counterparty', label: columns.counterparty },
            { key: 'total', label: columns.total, align: 'right' },
            { key: 'status', label: columns.status },
          ]}
          rows={visible.map((invoice) => {
            const href = `${invoicesHref}/${invoice.id}`
            const isDraft = invoice.status === 'borrador'
            const rectified = rectificationsOf(invoice, allInvoices).length > 0
            const overdue = !isDraft && invoice.kind === 'ordinaria' && paymentStatus(invoice, today) === 'vencida'
            const collectable = !isDraft && invoice.kind === 'ordinaria' && !invoice.paymentDate
            return {
              key: invoice.id,
              href,
              cells: [
                <span key="d">
                  {formatIsoDateEs(invoice.issueDate)}
                  {overdue ? (
                    <span className="block text-xs text-destructive">{copy.overdueDays(daysOverdue(invoice, today))}</span>
                  ) : collectable ? (
                    <span className="block text-xs text-muted-foreground">{copy.dueOn(formatIsoDateEs(invoice.dueDate))}</span>
                  ) : null}
                </span>,
                <span key="n">
                  <InvoiceLink href={href}>{invoice.invoiceNumber || facturacion.document.pendingNumber}</InvoiceLink>
                  {rectified ? <span className="block text-xs text-muted-foreground">{facturacion.lifecycle.rectified}</span> : null}
                </span>,
                <span key="c">
                  {invoice.counterpartyName || '—'}
                  {invoice.counterpartyTaxId ? <span className="block text-xs text-muted-foreground">{invoice.counterpartyTaxId}</span> : null}
                </span>,
                formatCents(invoice.totalCents),
                <InvoiceStatusPill key="s" invoice={invoice} today={today} />,
              ],
              mobile: (
                <>
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">{invoice.counterpartyName || '—'}</span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">{formatCents(invoice.totalCents)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {invoice.invoiceNumber || facturacion.document.pendingNumber} · {formatIsoDateEs(invoice.issueDate)}
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <InvoiceStatusPill invoice={invoice} today={today} />
                    {rectified ? <span className="text-xs text-muted-foreground">{facturacion.lifecycle.rectified}</span> : null}
                    {overdue ? (
                      <span className="text-xs text-destructive">{copy.overdueDays(daysOverdue(invoice, today))}</span>
                    ) : collectable ? (
                      <span className="text-xs text-muted-foreground">{copy.dueOn(formatIsoDateEs(invoice.dueDate))}</span>
                    ) : null}
                  </span>
                </>
              ),
            }
          })}
        />
      ) : null}
    </div>
  )
}
