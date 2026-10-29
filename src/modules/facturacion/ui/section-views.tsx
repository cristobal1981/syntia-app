'use client'

import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import { DashboardTab } from '@/src/modules/facturacion/ui/dashboard-tab'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { InvoiceDetailPage } from '@/src/modules/facturacion/ui/invoice-detail-page'
import { InvoiceFormPage } from '@/src/modules/facturacion/ui/invoice-form-page'
import { InvoicesTab } from '@/src/modules/facturacion/ui/invoices-tab'
import { ProductsTab } from '@/src/modules/facturacion/ui/products-tab'
import { PartiesTab } from '@/src/modules/facturacion/ui/parties-tab'
import { PartyFormPage } from '@/src/modules/facturacion/ui/party-form-page'
import { RectifyPage } from '@/src/modules/facturacion/ui/rectify-page'

/** Una vista por ruta: cada una toma lo que necesita del estado compartido del layout. */

const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)
const invoiceHref = (id: string) => `${invoicesHref}/${id}`

export function PanelSection() {
  const f = useFacturacion()
  return <DashboardTab invoices={f.invoices} periodInvoices={f.periodInvoices} year={f.year} today={f.today} invoiceHref={invoiceHref} />
}

export function InvoicesSection() {
  const f = useFacturacion()
  return <InvoicesTab invoices={f.periodAllInvoices} allInvoices={f.allInvoices} today={f.today} />
}

export function NewInvoiceSection() {
  return <InvoiceFormPage mode="new" />
}

export function InvoiceDetailSection({ invoiceId }: { invoiceId: string }) {
  return <InvoiceDetailPage invoiceId={invoiceId} />
}

export function EditInvoiceSection({ invoiceId }: { invoiceId: string }) {
  return <InvoiceFormPage key={invoiceId} mode="edit" invoiceId={invoiceId} />
}

export function RectifyInvoiceSection({ invoiceId }: { invoiceId: string }) {
  return <RectifyPage invoiceId={invoiceId} />
}

export function PartiesSection() {
  const f = useFacturacion()
  return <PartiesTab parties={f.parties} invoices={f.allInvoices} />
}

export function NewPartySection() {
  return <PartyFormPage mode="new" />
}

export function EditPartySection({ partyId }: { partyId: string }) {
  return <PartyFormPage key={partyId} mode="edit" partyId={partyId} />
}

export function ProductsSection() {
  return <ProductsTab />
}

