'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Plus, Receipt } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PortalEmptyState } from '@/components/ui/portal-empty-state'
import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import { getCategory } from '@/src/modules/facturacion/domain/categories'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { compareInvoices } from '@/src/modules/facturacion/domain/periods'
import { daysOverdue, paymentStatus, type PaymentStatus } from '@/src/modules/facturacion/domain/payment-status'
import { rectificationsOf } from '@/src/modules/facturacion/domain/rectification'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import { BookTable } from '@/src/modules/facturacion/ui/book-table'
import { LifecyclePills, PaymentPill, Pill } from '@/src/modules/facturacion/ui/invoice-badges'
import { InvoiceLink } from '@/src/modules/facturacion/ui/invoice-link'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

const copy = facturacion.invoices
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)

type StatusFilter = 'all' | PaymentStatus

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'pendiente', 'vencida', 'pagada']

function matches(invoice: Invoice, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [invoice.counterpartyName, invoice.counterpartyTaxId, invoice.invoiceNumber, invoice.concept]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

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
            matches(invoice, query)
        )
        .sort((a, b) => compareInvoices(b, a)),
    [invoices, status, query, today]
  )

  const actions = (
    <Button asChild>
      <Link href={`${invoicesHref}/nueva`}>
        <Plus aria-hidden />
        {facturacion.page.newInvoice}
      </Link>
    </Button>
  )

  if (invoices.length === 0) {
    return <PortalEmptyState icon={Receipt} title={copy.empty.title} description={copy.empty.description} action={actions} />
  }

  const columns = copy.columns

  return (
    <div className="flex flex-col gap-4">
      <div>{actions}</div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((value) => (
          <PortalFilterChip key={value} label={copy.statusFilters[value]} active={status === value} onClick={() => setStatus(value)} />
        ))}
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchLabel}
          className="h-9 w-full min-w-64 sm:w-80"
        />
      </div>

      <BookTable
        caption={facturacion.tabs.invoices}
        emptyMessage={copy.noResults}
        columns={[
          { key: 'date', label: columns.date },
          { key: 'number', label: columns.number },
          { key: 'due', label: columns.due },
          { key: 'counterparty', label: columns.counterparty },
          { key: 'category', label: columns.category },
          { key: 'total', label: columns.total, align: 'right' },
          { key: 'status', label: columns.status },
          { key: 'actions', label: columns.actions },
        ]}
        rows={visible.map((invoice) => {
          const href = `${invoicesHref}/${invoice.id}`
          const isDraft = invoice.status === 'borrador'
          const rectified = rectificationsOf(invoice, allInvoices).length > 0
          return {
            key: invoice.id,
            href,
            cells: [
              formatIsoDateEs(invoice.issueDate),
              <span key="n">
                <InvoiceLink href={href}>{invoice.invoiceNumber || facturacion.document.pendingNumber}</InvoiceLink>
                <span className="block text-xs text-muted-foreground">
                  {invoice.kind === 'rectificativa' ? facturacion.lifecycle.kind.rectificativa : facturacion.lifecycle.kind.ordinaria}
                </span>
              </span>,
              <span key="d">
                {isDraft ? '—' : formatIsoDateEs(invoice.dueDate)}
                {!isDraft && paymentStatus(invoice, today) === 'vencida' ? (
                  <span className="block text-xs text-destructive">{copy.overdueDays(daysOverdue(invoice, today))}</span>
                ) : null}
              </span>,
              <span key="c">
                {invoice.counterpartyName || '—'}
                <span className="block text-xs text-muted-foreground">{invoice.counterpartyTaxId}</span>
              </span>,
              getCategory(invoice.categoryId).label,
              formatCents(invoice.totalCents),
              <span key="s" className="flex flex-col items-start gap-1">
                <span className="flex flex-wrap gap-1">
                  <LifecyclePills invoice={invoice} rectified={rectified} />
                </span>
                {!isDraft ? <PaymentPill invoice={invoice} today={today} /> : null}
                {!isDraft ? <Pill tone={invoice.review === 'revisada' ? 'done' : 'pending'}>{copy.review[invoice.review]}</Pill> : null}
              </span>,
              <PortalActionTooltip key="a" content={copy.open}>
                <Button asChild variant="ghost" size="icon-sm">
                  <Link href={href} aria-label={copy.open}>
                    <Eye aria-hidden />
                  </Link>
                </Button>
              </PortalActionTooltip>,
            ],
          }
        })}
      />
    </div>
  )
}
