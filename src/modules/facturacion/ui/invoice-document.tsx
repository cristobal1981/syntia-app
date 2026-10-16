import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import { getCategory } from '@/src/modules/facturacion/domain/categories'
import { formatIssuerAddress, type Issuer } from '@/src/modules/facturacion/domain/issuer'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

const copy = facturacion.document

function rateLabel(rate: number): string {
  return `${String(rate).replace('.', ',')} %`
}

type InvoiceDocumentProps = {
  invoice: Invoice
  /** Emisor vigente: solo se usa en un borrador; una expedida lleva el suyo congelado. */
  currentIssuer: Issuer
  /** Factura que rectifica esta (si es rectificativa). */
  original: Invoice | null
}

/**
 * La factura tal como la recibe el cliente: una hoja clara y fija (no sigue el tema de la
 * app) pensada para imprimirse o guardarse como PDF desde el navegador.
 */
export function InvoiceDocument({ invoice, currentIssuer, original }: InvoiceDocumentProps) {
  const issuer = invoice.issuer ?? currentIssuer
  const isDraft = invoice.status === 'borrador'
  const category = getCategory(invoice.categoryId, invoice.direction)
  const taxName = invoice.regime === 'igic' ? 'IGIC' : 'IVA'

  return (
    <article
      className="invoice-print-area mx-auto w-full max-w-[52rem] rounded-sm bg-white p-8 text-[13px] leading-relaxed text-neutral-900 shadow-md ring-1 ring-black/10 sm:p-12"
      aria-label={invoice.invoiceNumber || copy.pendingNumber}
    >
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-300 pb-6">
        <div>
          <p className="text-lg font-semibold tracking-wide">
            {invoice.kind === 'rectificativa' ? copy.rectificativa : copy.invoice}
          </p>
          <p className="mt-1 font-mono text-sm">{invoice.invoiceNumber || copy.pendingNumber}</p>
        </div>
        <dl className="text-right">
          <dt className="text-neutral-500">{copy.date}</dt>
          <dd className="font-medium">{formatIsoDateEs(invoice.issueDate)}</dd>
          {invoice.kind === 'ordinaria' ? (
            <>
              <dt className="mt-2 text-neutral-500">{copy.due}</dt>
              <dd className="font-medium">{formatIsoDateEs(invoice.dueDate)}</dd>
            </>
          ) : null}
        </dl>
      </header>

      {isDraft ? (
        <p className="mt-4 inline-block rounded border border-amber-500 px-2 py-0.5 text-xs font-semibold tracking-widest text-amber-700">
          {copy.draft}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section aria-label={copy.from}>
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{copy.from}</h2>
          <p className="mt-1 font-semibold">{issuer.name}</p>
          <p>
            {copy.taxId}: {issuer.taxId}
          </p>
          <p>{formatIssuerAddress(issuer)}</p>
          {issuer.email ? <p>{issuer.email}</p> : null}
        </section>
        <section aria-label={copy.to}>
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{copy.to}</h2>
          <p className="mt-1 font-semibold">{invoice.counterpartyName || '—'}</p>
          <p>
            {copy.taxId}: {invoice.counterpartyTaxId || '—'}
          </p>
          <p>{invoice.counterpartyAddress || '—'}</p>
        </section>
      </div>

      {original ? (
        <section className="mt-6 rounded border border-neutral-300 bg-neutral-50 p-3" aria-label={copy.rectifiesLine(original.invoiceNumber, '')}>
          <p className="font-medium">{copy.rectifiesLine(original.invoiceNumber, formatIsoDateEs(original.issueDate))}</p>
          <p className="mt-1">
            <span className="text-neutral-500">{copy.reasonLine}: </span>
            {invoice.rectificationReason}
          </p>
        </section>
      ) : null}

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500 uppercase">
            <th className="py-2 font-semibold">{copy.description}</th>
            <th className="py-2 text-right font-semibold">{copy.base}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-200 align-top">
            <td className="py-3">
              {invoice.concept || '—'}
              <span className="block text-xs text-neutral-500">{category.label}</span>
            </td>
            <td className="py-3 text-right tabular-nums">{formatCents(invoice.baseCents)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="mt-4 ml-auto w-full max-w-xs space-y-1">
        <div className="flex justify-between">
          <dt>{`${taxName} (${rateLabel(invoice.taxRate)})`}</dt>
          <dd className="tabular-nums">{formatCents(invoice.taxCents)}</dd>
        </div>
        {invoice.withholdingCents !== 0 ? (
          <div className="flex justify-between">
            <dt>{`${copy.withholding} (${rateLabel(invoice.withholdingRate)})`}</dt>
            <dd className="tabular-nums">{formatCents(-invoice.withholdingCents)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-neutral-400 pt-2 text-base font-semibold">
          <dt>{copy.total}</dt>
          <dd className="tabular-nums">{formatCents(invoice.totalCents)}</dd>
        </div>
      </dl>

      <footer className="mt-12 border-t border-neutral-200 pt-3 text-center text-[11px] text-neutral-500">{copy.footer}</footer>
    </article>
  )
}
