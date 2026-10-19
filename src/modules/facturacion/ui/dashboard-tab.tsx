'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import {
  buildMonthlySeries,
  buildPendingSummary,
  listOverdueInvoices,
} from '@/src/modules/facturacion/domain/dashboard'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { buildParties } from '@/src/modules/facturacion/domain/parties'
import { daysOverdue } from '@/src/modules/facturacion/domain/payment-status'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import { InvoiceLink } from '@/src/modules/facturacion/ui/invoice-link'
import { ComplianceCard } from '@/src/modules/facturacion/ui/compliance-card'
import { MonthlyChart } from '@/src/modules/facturacion/ui/monthly-chart'
import { sectionHref } from '@/src/modules/facturacion/domain/sections'

const copy = facturacion.dashboard
const TOP_PARTIES = 5
const OVERDUE_LIMIT = 5

type DashboardTabProps = {
  /** Todas las facturas: lo pendiente y lo vencido es a día de hoy. */
  invoices: Invoice[]
  /** Las del periodo elegido: para clientes. */
  periodInvoices: Invoice[]
  year: number
  today: string
  invoiceHref: (id: string) => string
}

/** Lo primero que se quiere saber: cuánto se debe y quién lo debe, con la acción de facturar a mano. */
function PendingCard({
  invoices,
  today,
  invoiceHref,
}: {
  invoices: Invoice[]
  today: string
  invoiceHref: (id: string) => string
}) {
  const text = copy.issued
  const summary = useMemo(() => buildPendingSummary(invoices, today), [invoices, today])
  const overdue = useMemo(() => listOverdueInvoices(invoices, today, OVERDUE_LIMIT), [invoices, today])

  return (
    <section className="portal-home-card flex flex-col gap-4 rounded-xl p-4 sm:p-5" aria-label={text.title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-sm font-semibold text-muted-foreground">{text.pendingLabel}</h2>
          <p className="font-sans text-3xl font-semibold tabular-nums text-foreground">{formatCents(summary.pendingCents)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.pendingCount(summary.pendingCount)} ·{' '}
            <span className={summary.overdueCount > 0 ? 'font-medium text-destructive' : undefined}>
              {copy.overdue(summary.overdueCount, formatCents(summary.overdueCents))}
            </span>
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={sectionHref({ slug: 'facturas/nueva' })}>
            <Plus aria-hidden />
            {text.new}
          </Link>
        </Button>
      </div>

      {overdue.length === 0 ? (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground dark:border-border/50">{copy.overdueEmpty}</p>
      ) : (
        <div className="border-t border-border pt-3 dark:border-border/50">
          <h3 className="font-sans text-sm font-semibold text-foreground">{copy.overdueTitle}</h3>
          <ul className="mt-1 flex flex-col divide-y divide-border dark:divide-border/50">
            {overdue.map((invoice) => (
              <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="text-foreground">{invoice.counterpartyName}</span>
                  <span className="ml-2">
                    <InvoiceLink href={invoiceHref(invoice.id)}>{invoice.invoiceNumber}</InvoiceLink>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {copy.overdueSince(daysOverdue(invoice, today))} · {formatIsoDateEs(invoice.dueDate)}
                  </span>
                </span>
                <span className="font-medium tabular-nums text-foreground">{formatCents(invoice.totalCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function TopClients({ invoices }: { invoices: Invoice[] }) {
  const title = copy.topClients
  const parties = useMemo(() => buildParties(invoices).slice(0, TOP_PARTIES), [invoices])

  return (
    <section className="portal-home-card rounded-xl p-4 sm:p-5" aria-label={title}>
      <h2 className="font-sans text-base font-semibold text-foreground">{title}</h2>
      {parties.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.noParties}</p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-border dark:divide-border/50">
          {parties.map((party) => (
            <li key={party.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate text-foreground">{party.name}</span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">{formatCents(party.billedCents)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function DashboardTab({ invoices, periodInvoices, year, today, invoiceHref }: DashboardTabProps) {
  const series = useMemo(() => buildMonthlySeries(invoices, year), [invoices, year])

  return (
    <div className="flex flex-col gap-4">
      <PendingCard invoices={invoices} today={today} invoiceHref={invoiceHref} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MonthlyChart series={series} />
        <TopClients invoices={periodInvoices} />
      </div>

      <ComplianceCard />
    </div>
  )
}
