'use client'

import { useMemo } from 'react'

import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import { AGING_BUCKETS, buildAging } from '@/src/modules/facturacion/domain/aging'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import type { Invoice, InvoiceDirection } from '@/src/modules/facturacion/domain/types'
import { BookHeading, BookTable } from '@/src/modules/facturacion/ui/book-table'

const copy = facturacion.collections

function AgingTable({ invoices, direction, today }: { invoices: Invoice[]; direction: InvoiceDirection; today: string }) {
  const report = useMemo(() => buildAging(invoices, direction, today), [invoices, direction, today])
  const text = direction === 'emitida' ? copy.receivable : copy.payable

  return (
    <section className="flex flex-col gap-3" aria-label={text.title}>
      <BookHeading title={text.title} description={text.description} />
      <BookTable
        caption={text.title}
        emptyMessage={copy.empty}
        columns={[
          { key: 'party', label: text.party },
          ...AGING_BUCKETS.map((bucket) => ({ key: bucket, label: copy.buckets[bucket], align: 'right' as const })),
          { key: 'total', label: copy.total, align: 'right' },
        ]}
        rows={report.rows.map((row) => ({
          key: row.partyKey,
          cells: [
            row.name,
            ...AGING_BUCKETS.map((bucket) => (row.buckets[bucket] ? formatCents(row.buckets[bucket]) : '')),
            formatCents(row.totalCents),
          ],
        }))}
        footer={[copy.total, ...AGING_BUCKETS.map((bucket) => formatCents(report.totals[bucket])), formatCents(report.totalCents)]}
      />
    </section>
  )
}

export function CollectionsTab({ invoices, today }: { invoices: Invoice[]; today: string }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">{copy.asOf(formatIsoDateEs(today))}</p>
      <AgingTable invoices={invoices} direction="emitida" today={today} />
      <AgingTable invoices={invoices} direction="recibida" today={today} />
    </div>
  )
}
