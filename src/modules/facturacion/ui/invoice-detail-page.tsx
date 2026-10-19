'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FilePenLine, Lock, Maximize2, Printer, Stamp, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import { getCategory } from '@/src/modules/facturacion/domain/categories'
import type { EmissionIssue } from '@/src/modules/facturacion/domain/emission'
import { canDeleteInvoice, isLocked } from '@/src/modules/facturacion/domain/invoice-rules'
import { emitDraft, removeInvoice, setPaymentDate, setReview } from '@/src/modules/facturacion/domain/invoicing-state'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import { daysOverdue, paymentStatus } from '@/src/modules/facturacion/domain/payment-status'
import { canRectify, netAmountsAfterRectification, rectificationsOf } from '@/src/modules/facturacion/domain/rectification'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import { runInvoicingOperation } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { deleteInvoicePdf } from '@/src/modules/facturacion/infrastructure/local-pdf-store'
import { AttachmentPreview } from '@/src/modules/facturacion/ui/attachment-preview'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { InvoiceDocument } from '@/src/modules/facturacion/ui/invoice-document'
import { LifecyclePills, PaymentPill, Pill } from '@/src/modules/facturacion/ui/invoice-badges'
import { InvoicePdfPreview } from '@/src/modules/facturacion/ui/invoice-pdf-preview'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

const copy = facturacion.page.detail
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)

function rateLabel(rate: number): string {
  return `${String(rate).replace('.', ',')} %`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  )
}

function Card({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) {
  return (
    <section className="portal-home-card rounded-xl p-4 sm:p-5" aria-label={title}>
      <h2 className="font-sans text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function InvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const { allInvoices, issuer, events, today } = useFacturacion()
  const [confirmEmit, setConfirmEmit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [emitIssues, setEmitIssues] = useState<EmissionIssue[]>([])
  const [viewer, setViewer] = useState(false)

  const invoice = allInvoices.find((candidate) => candidate.id === invoiceId) ?? null
  const original = invoice?.rectifies ? (allInvoices.find((candidate) => candidate.id === invoice.rectifies) ?? null) : null
  const rectifications = useMemo(() => (invoice ? rectificationsOf(invoice, allInvoices) : []), [invoice, allInvoices])
  const history = events.filter((event) => event.invoiceId === invoiceId).slice().reverse()

  if (!invoice) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={invoicesHref}>
            <ArrowLeft aria-hidden />
            {facturacion.page.back}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{copy.notFound}</p>
      </div>
    )
  }

  const direction = invoice.direction
  const locked = isLocked(invoice)
  const isDraft = invoice.status === 'borrador'
  const status = paymentStatus(invoice, today)
  const category = getCategory(invoice.categoryId, direction)
  const net = rectifications.length > 0 ? netAmountsAfterRectification(invoice, allInvoices) : null
  const title = invoice.invoiceNumber || facturacion.document.pendingNumber

  const handleEmit = () => {
    const result = runInvoicingOperation((state, context) => emitDraft(state, invoice.id, context))
    if (result.ok) {
      setEmitIssues([])
      toast.success(copy.emitted(result.invoice.invoiceNumber))
    } else if (result.error === 'invalid') {
      setEmitIssues(result.issues)
    }
  }

  const handleDelete = async () => {
    const result = runInvoicingOperation((state, context) => removeInvoice(state, invoice.id, context))
    if (!result.ok) return
    await deleteInvoicePdf(invoice.id)
    toast.success(facturacion.editor.deleted)
    router.push(invoicesHref)
  }

  const togglePayment = () => {
    runInvoicingOperation((state, context) =>
      setPaymentDate(state, invoice.id, invoice.paymentDate ? null : today < invoice.issueDate ? invoice.issueDate : today, context)
    )
  }

  const toggleReview = () => {
    runInvoicingOperation((state, context) =>
      setReview(state, invoice.id, invoice.review === 'revisada' ? 'pendiente' : 'revisada', context)
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={invoicesHref}>
            <ArrowLeft aria-hidden />
            {facturacion.page.back}
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoice.counterpartyName} · {formatIsoDateEs(invoice.issueDate)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LifecyclePills invoice={invoice} rectified={rectifications.length > 0} />
              {!isDraft ? <PaymentPill invoice={invoice} today={today} /> : null}
              <Pill tone={invoice.review === 'revisada' ? 'done' : 'pending'}>{facturacion.invoices.review[invoice.review]}</Pill>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {isDraft && direction === 'emitida' ? (
              <Button type="button" onClick={() => setConfirmEmit(true)}>
                <Stamp aria-hidden />
                {copy.actions.emit}
              </Button>
            ) : null}
            {canRectify(invoice) ? (
              <Button asChild>
                <Link href={`${invoicesHref}/${invoice.id}/rectificar`}>
                  <Undo2 aria-hidden />
                  {copy.actions.rectify}
                </Link>
              </Button>
            ) : null}
            {!locked ? (
              <Button asChild variant="outline">
                <Link href={`${invoicesHref}/${invoice.id}/editar`}>
                  <FilePenLine aria-hidden />
                  {copy.actions.edit}
                </Link>
              </Button>
            ) : null}
            {!isDraft ? (
              <Button type="button" variant="outline" onClick={togglePayment}>
                {invoice.paymentDate ? copy.actions.markUnpaid[direction] : copy.actions.markPaid[direction]}
              </Button>
            ) : null}
            {!isDraft ? (
              <Button type="button" variant="outline" onClick={toggleReview}>
                {invoice.review === 'revisada' ? copy.actions.markPending : copy.actions.markReviewed}
              </Button>
            ) : null}
            {canDeleteInvoice(invoice) ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                {copy.actions.delete}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {emitIssues.length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <ul className="list-disc space-y-0.5 pl-5 text-foreground">
            {emitIssues.map((issue) => (
              <li key={`${issue.code}-${issue.field}`}>{copy.emitIssues[issue.code]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {locked ? (
        <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
          <div>
            <p className="font-medium text-foreground">{copy.lockedTitle}</p>
            <p className="mt-0.5 text-muted-foreground">{copy.lockedBody}</p>
          </div>
        </div>
      ) : isDraft && direction === 'emitida' ? (
        <div className="rounded-lg border border-service-fiscal/40 bg-service-fiscal/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{copy.draftTitle}</p>
          <p className="mt-0.5 text-muted-foreground">{copy.draftBody}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-3" aria-label={direction === 'emitida' ? copy.document : copy.attachment}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-base font-semibold text-foreground">
              {direction === 'emitida' ? copy.document : copy.attachment}
            </h2>
            {direction === 'emitida' ? (
              <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                <Printer aria-hidden />
                {copy.print}
              </Button>
            ) : invoice.pdfName ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setViewer(true)}>
                <Maximize2 aria-hidden />
                {copy.expand}
              </Button>
            ) : null}
          </div>

          {direction === 'emitida' ? (
            <div className="overflow-x-auto rounded-xl bg-muted/40 p-3 sm:p-6 dark:bg-muted/20">
              <InvoiceDocument invoice={invoice} currentIssuer={issuer} original={original} />
            </div>
          ) : (
            <AttachmentPreview
              invoiceId={invoice.pdfName ? invoice.id : undefined}
              name={invoice.pdfName ?? ''}
              mimetype={invoice.attachmentMime}
              emptyMessage={copy.noAttachment}
            />
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <Card title={copy.info}>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label={facturacion.detail.fields.counterparty[direction]}>
                {invoice.counterpartyName}
                {invoice.counterpartyAddress ? (
                  <span className="block text-xs text-muted-foreground">{invoice.counterpartyAddress}</span>
                ) : null}
              </Field>
              <Field label={facturacion.detail.fields.taxId}>{invoice.counterpartyTaxId || facturacion.detail.fields.none}</Field>
              <Field label={facturacion.detail.fields.issueDate}>{formatIsoDateEs(invoice.issueDate)}</Field>
              <Field label={facturacion.detail.fields.dueDate}>
                {formatIsoDateEs(invoice.dueDate)}
                {!isDraft && status === 'vencida' ? (
                  <span className="ml-2 text-xs text-destructive">{facturacion.invoices.overdueDays(daysOverdue(invoice, today))}</span>
                ) : null}
              </Field>
              <Field label={facturacion.detail.fields.paymentDate[direction]}>
                {invoice.paymentDate ? formatIsoDateEs(invoice.paymentDate) : facturacion.detail.fields.none}
              </Field>
              <Field label={facturacion.detail.fields.category}>{category.label}</Field>
              {invoice.issuedAt ? (
                <Field label={copy.issuedAt}>
                  {new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(invoice.issuedAt))}
                </Field>
              ) : null}
              <div className="sm:col-span-2">
                <Field label={facturacion.detail.fields.concept}>{invoice.concept || facturacion.detail.fields.none}</Field>
              </div>
            </dl>
          </Card>

          {invoice.kind === 'rectificativa' && original ? (
            <Card title={copy.rectifies}>
              <p className="text-sm text-foreground">
                <Link href={`${invoicesHref}/${original.id}`} className="font-medium underline underline-offset-4">
                  {original.invoiceNumber}
                </Link>{' '}
                · {formatIsoDateEs(original.issueDate)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{copy.reason}</p>
              <p className="text-sm text-foreground">{invoice.rectificationReason}</p>
            </Card>
          ) : null}

          {rectifications.length > 0 && net ? (
            <Card title={copy.rectifiedBy}>
              <ul className="flex flex-col gap-1.5">
                {rectifications.map((rectification) => (
                  <li key={rectification.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`${invoicesHref}/${rectification.id}`} className="font-medium text-foreground underline underline-offset-4">
                      {rectification.invoiceNumber}
                    </Link>
                    <span className="tabular-nums text-foreground">{formatCents(rectification.totalCents)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm font-semibold text-foreground dark:border-border/50">
                <span>{copy.net}</span>
                <span className="tabular-nums">{formatCents(net.totalCents)}</span>
              </p>
            </Card>
          ) : null}

          <Card title={facturacion.detail.sections.amounts}>
            <dl className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm dark:divide-border/50">
              <div className="flex justify-between px-4 py-2">
                <dt className="text-muted-foreground">{facturacion.detail.fields.base}</dt>
                <dd className="tabular-nums text-foreground">{formatCents(invoice.baseCents)}</dd>
              </div>
              <div className="flex justify-between px-4 py-2">
                <dt className="text-muted-foreground">
                  {facturacion.detail.fields.tax(invoice.regime === 'igic' ? 'IGIC' : 'IVA', rateLabel(invoice.taxRate))}
                </dt>
                <dd className="tabular-nums text-foreground">{formatCents(invoice.taxCents)}</dd>
              </div>
              {invoice.withholdingCents !== 0 ? (
                <div className="flex justify-between px-4 py-2">
                  <dt className="text-muted-foreground">{facturacion.detail.fields.withholding(rateLabel(invoice.withholdingRate))}</dt>
                  <dd className="tabular-nums text-foreground">{formatCents(-invoice.withholdingCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between bg-muted/40 px-4 py-2 font-semibold">
                <dt className="text-foreground">{facturacion.detail.fields.total}</dt>
                <dd className="tabular-nums text-foreground">{formatCents(invoice.totalCents)}</dd>
              </div>
              {direction === 'recibida' ? (
                <div className="flex justify-between px-4 py-2">
                  <dt className="text-muted-foreground">{facturacion.detail.fields.deductible}</dt>
                  <dd className="tabular-nums text-foreground">{invoice.deductiblePercent} %</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card title={facturacion.history.title} description={facturacion.history.description}>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{facturacion.history.empty}</p>
            ) : (
              <ol className="flex flex-col gap-2.5">
                {history.map((event) => (
                  <li key={event.id} className="text-sm">
                    <p className="text-foreground">{event.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.at))}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <PortalConfirmDialog
        open={confirmEmit}
        onOpenChange={setConfirmEmit}
        title={copy.confirmEmitTitle}
        description={copy.confirmEmitBody}
        confirmLabel={copy.confirmEmit}
        onConfirm={handleEmit}
      />
      <PortalConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={copy.deleteTitle}
        description={copy.deleteBody}
        confirmLabel={copy.actions.delete}
        confirmVariant="destructive"
        onConfirm={() => void handleDelete()}
      />
      <InvoicePdfPreview
        invoiceId={viewer ? invoice.id : null}
        filename={invoice.pdfName}
        mimetype={invoice.attachmentMime}
        onClose={() => setViewer(false)}
      />
    </div>
  )
}
