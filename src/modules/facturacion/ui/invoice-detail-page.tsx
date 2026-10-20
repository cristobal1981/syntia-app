'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FilePenLine, HandCoins, Lock, Printer, Stamp, Undo2 } from 'lucide-react'
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
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { InvoiceDocument } from '@/src/modules/facturacion/ui/invoice-document'
import { InvoiceActionsMenu, type InvoiceMenuAction } from '@/src/modules/facturacion/ui/invoice-actions-menu'
import { InvoiceStatusPill, Pill } from '@/src/modules/facturacion/ui/invoice-badges'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { NotFoundState } from '@/src/modules/facturacion/ui/not-found-state'

const copy = facturacion.page.detail
const longDateTime = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' })
const mediumDateTime = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)
const settingsHref = sectionHref(SECTIONS.find((section) => section.id === 'settings')!)

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
    <section className="portal-home-card rounded-xl p-4 sm:p-5">
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
  const issuesRef = useRef<HTMLDivElement>(null)

  // Al fallar la emisión, el foco pasa al aviso: quien usa teclado o lector de pantalla se entera.
  useEffect(() => {
    if (emitIssues.length > 0) issuesRef.current?.focus()
  }, [emitIssues])

  const invoice = allInvoices.find((candidate) => candidate.id === invoiceId) ?? null
  const original = invoice?.rectifies ? (allInvoices.find((candidate) => candidate.id === invoice.rectifies) ?? null) : null
  const rectifications = useMemo(() => (invoice ? rectificationsOf(invoice, allInvoices) : []), [invoice, allInvoices])
  const history = events.filter((event) => event.invoiceId === invoiceId).slice().reverse()

  if (!invoice) {
    return (
      <NotFoundState
        title={copy.notFound.title}
        description={copy.notFound.description}
        backHref={invoicesHref}
        backLabel={facturacion.page.back}
      />
    )
  }

  const locked = isLocked(invoice)
  const isDraft = invoice.status === 'borrador'
  const status = paymentStatus(invoice, today)
  const category = getCategory(invoice.categoryId)
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

  const handleDelete = () => {
    const result = runInvoicingOperation((state, context) => removeInvoice(state, invoice.id, context))
    if (!result.ok) return
    toast.success(facturacion.editor.deleted)
    router.push(invoicesHref)
  }

  const togglePayment = () => {
    const previous = invoice.paymentDate
    const next = previous ? null : today < invoice.issueDate ? invoice.issueDate : today
    runInvoicingOperation((state, context) => setPaymentDate(state, invoice.id, next, context))
    toast.success(previous ? facturacion.detail.toasts.unpaid : facturacion.detail.toasts.paid, {
      action: {
        label: facturacion.detail.actions.undo,
        onClick: () => runInvoicingOperation((state, context) => setPaymentDate(state, invoice.id, previous, context)),
      },
    })
  }

  const toggleReview = () => {
    const previous = invoice.review
    const next = previous === 'revisada' ? 'pendiente' : 'revisada'
    runInvoicingOperation((state, context) => setReview(state, invoice.id, next, context))
    toast.success(next === 'revisada' ? facturacion.detail.toasts.reviewed : facturacion.detail.toasts.pending, {
      action: {
        label: facturacion.detail.actions.undo,
        onClick: () => runInvoicingOperation((state, context) => setReview(state, invoice.id, previous, context)),
      },
    })
  }

  const collectable = !isDraft && invoice.kind === 'ordinaria'
  const markPaidIsNext = collectable && !invoice.paymentDate
  const rectified = rectifications.length > 0

  // Una sola acción principal según el estado; lo demás, a la vista solo si es el siguiente paso probable.
  const menuActions: InvoiceMenuAction[] = [
    ...(collectable && invoice.paymentDate ? [{ key: 'unpay', label: copy.actions.markUnpaid, onSelect: togglePayment }] : []),
    ...(!isDraft
      ? [
          {
            key: 'review',
            label: invoice.review === 'revisada' ? copy.actions.markPending : copy.actions.markReviewed,
            onSelect: toggleReview,
          },
        ]
      : []),
    ...(canDeleteInvoice(invoice)
      ? [{ key: 'delete', label: copy.actions.delete, onSelect: () => setConfirmDelete(true), destructive: true }]
      : []),
  ]

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
            <h1 className="font-sans text-2xl font-semibold text-foreground [overflow-wrap:anywhere] md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {invoice.counterpartyName} · {formatIsoDateEs(invoice.issueDate)}
            </p>
            <p className="mt-2 font-sans text-2xl font-semibold tabular-nums text-foreground">{formatCents(invoice.totalCents)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <InvoiceStatusPill invoice={invoice} today={today} />
              {rectified ? <Pill tone="neutral">{facturacion.lifecycle.rectified}</Pill> : null}
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {isDraft ? (
              <Button type="button" onClick={() => setConfirmEmit(true)}>
                <Stamp aria-hidden />
                {copy.actions.emit}
              </Button>
            ) : null}
            {markPaidIsNext ? (
              <Button type="button" onClick={togglePayment}>
                <HandCoins aria-hidden />
                {copy.actions.markPaid}
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
            {canRectify(invoice) ? (
              <Button asChild variant="outline">
                <Link href={`${invoicesHref}/${invoice.id}/rectificar`}>
                  <Undo2 aria-hidden />
                  {copy.actions.rectify}
                </Link>
              </Button>
            ) : null}
            <InvoiceActionsMenu label={copy.actions.more} actions={menuActions} />
          </div>
        </div>
      </div>

      {emitIssues.length > 0 ? (
        <div
          ref={issuesRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ul className="list-disc space-y-0.5 pl-5 text-foreground">
            {emitIssues.map((issue) => (
              <li key={`${issue.code}-${issue.field}`}>{copy.emitIssues[issue.code]}</li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {emitIssues.some((issue) => issue.code === 'issuer_incomplete') ? (
              <Link href={settingsHref} className="font-medium text-foreground underline underline-offset-4">
                {copy.fixIssuer}
              </Link>
            ) : null}
            {emitIssues.some((issue) => issue.code !== 'issuer_incomplete') && !locked ? (
              <Link href={`${invoicesHref}/${invoice.id}/editar`} className="font-medium text-foreground underline underline-offset-4">
                {copy.fixEmitIssues}
              </Link>
            ) : null}
          </p>
        </div>
      ) : null}

      {locked ? (
        <p className="flex max-w-3xl items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
          <span>
            <span className="font-medium text-foreground">{copy.lockedTitle}.</span> {copy.lockedBody}
          </span>
        </p>
      ) : isDraft ? (
        <p className="max-w-3xl text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{copy.draftTitle}.</span> {copy.draftBody}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-3" aria-label={copy.document}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-base font-semibold text-foreground">{copy.document}</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden />
              {copy.print}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl bg-muted/40 p-2 sm:p-6 dark:bg-muted/20">
            <InvoiceDocument invoice={invoice} currentIssuer={issuer} original={original} />
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <Card title={copy.info}>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label={facturacion.detail.fields.counterparty}>
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
              <Field label={facturacion.detail.fields.paymentDate}>
                {invoice.paymentDate ? formatIsoDateEs(invoice.paymentDate) : facturacion.detail.fields.none}
              </Field>
              <Field label={facturacion.detail.fields.category}>{category.label}</Field>
              {!isDraft ? <Field label={facturacion.detail.fields.review}>{facturacion.invoices.review[invoice.review]}</Field> : null}
              {invoice.issuedAt ? (
                <Field label={copy.issuedAt}>
                  {longDateTime.format(new Date(invoice.issuedAt))}
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

          <details className="portal-home-card group rounded-xl p-4 sm:p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm font-sans text-base font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              {facturacion.history.title}
              <span className="text-xs font-normal text-muted-foreground">{facturacion.history.count(history.length)}</span>
            </summary>
            <p className="mt-0.5 text-xs text-muted-foreground">{facturacion.history.description}</p>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{facturacion.history.empty}</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-2.5">
                {history.map((event) => (
                  <li key={event.id} className="text-sm">
                    <p className="text-foreground">{event.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {mediumDateTime.format(new Date(event.at))}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </details>
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
        onConfirm={handleDelete}
      />
    </div>
  )
}
