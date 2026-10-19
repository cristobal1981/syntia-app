'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { formatPartyAddress, partiesWithStats, type Party } from '@/src/modules/facturacion/domain/party-directory'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import { BookTable } from '@/src/modules/facturacion/ui/book-table'
import { InvoiceLink } from '@/src/modules/facturacion/ui/invoice-link'

const copy = facturacion.partyPages
const partiesHref = sectionHref(SECTIONS.find((section) => section.id === 'parties')!)

export function PartiesTab({ parties, invoices }: { parties: Party[]; invoices: Invoice[] }) {
  const rows = useMemo(
    () => partiesWithStats(parties, invoices).sort((a, b) => b.issuedCents + b.receivedCents - (a.issuedCents + a.receivedCents) || a.name.localeCompare(b.name)),
    [parties, invoices]
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">{facturacion.parties.description}</p>
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href={`${partiesHref}/nuevo`}>
            <Plus aria-hidden />
            {copy.newButton}
          </Link>
        </Button>
      </div>
      <BookTable
        caption={facturacion.parties.title}
        emptyMessage={facturacion.parties.empty}
        columns={[
          { key: 'name', label: copy.columns.name },
          { key: 'taxId', label: copy.columns.taxId },
          { key: 'city', label: copy.columns.city },
          { key: 'contact', label: copy.columns.contact },
          { key: 'count', label: copy.columns.invoices, align: 'right' },
          { key: 'issued', label: copy.columns.issued, align: 'right' },
          { key: 'received', label: copy.columns.received, align: 'right' },
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
              party.issuedCents ? formatCents(party.issuedCents) : '',
              party.receivedCents ? formatCents(party.receivedCents) : '',
              party.pendingCents ? formatCents(party.pendingCents) : '',
            ],
          }
        })}
      />
    </div>
  )
}
