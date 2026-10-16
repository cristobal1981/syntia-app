'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { formatPartyAddress, partiesWithStats, type Party, type PartyKind } from '@/src/modules/facturacion/domain/party-directory'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import { BookTable } from '@/src/modules/facturacion/ui/book-table'
import { InvoiceLink } from '@/src/modules/facturacion/ui/invoice-link'

const copy = facturacion.partyPages
const partiesHref = sectionHref(SECTIONS.find((section) => section.id === 'parties')!)

function PartiesTable({ kind, parties, invoices }: { kind: PartyKind; parties: Party[]; invoices: Invoice[] }) {
  const rows = useMemo(
    () =>
      partiesWithStats(
        parties.filter((party) => party.kind === kind),
        invoices
      ).sort((a, b) => b.billedCents - a.billedCents || a.name.localeCompare(b.name)),
    [parties, invoices, kind]
  )
  const title = kind === 'cliente' ? facturacion.parties.clients.title : facturacion.parties.suppliers.title

  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
        <Button asChild size="sm">
          <Link href={`${partiesHref}/nuevo?tipo=${kind}`}>
            <Plus aria-hidden />
            {copy.newButtons[kind]}
          </Link>
        </Button>
      </div>
      <BookTable
        caption={title}
        emptyMessage={facturacion.parties.empty}
        columns={[
          { key: 'name', label: copy.columns.name },
          { key: 'taxId', label: copy.columns.taxId },
          { key: 'city', label: copy.columns.city },
          { key: 'contact', label: copy.columns.contact },
          { key: 'count', label: copy.columns.invoices, align: 'right' },
          { key: 'billed', label: copy.columns.billed, align: 'right' },
          { key: 'pending', label: copy.columns.pending, align: 'right' },
        ]}
        rows={rows.map((party) => {
          const href = `${partiesHref}/${party.id}`
          return {
            key: party.id,
            href,
            cells: [
              <InvoiceLink key="n" href={href}>
                {party.name}
              </InvoiceLink>,
              party.taxId,
              party.city || formatPartyAddress(party) || '—',
              party.email || party.phone || '—',
              party.invoiceCount,
              formatCents(party.billedCents),
              party.pendingCents ? formatCents(party.pendingCents) : '',
            ],
          }
        })}
      />
    </section>
  )
}

export function PartiesTab({ parties, invoices }: { parties: Party[]; invoices: Invoice[] }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-3xl text-sm text-muted-foreground">{facturacion.parties.description}</p>
      <PartiesTable kind="cliente" parties={parties} invoices={invoices} />
      <PartiesTable kind="proveedor" parties={parties} invoices={invoices} />
    </div>
  )
}
