'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileWarning, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { facturas } from '@/content/facturas'
import { cn } from '@/lib/utils'
import {
  cancelOrRectifyFacturaAction,
  createFacturaDraftAction,
  emitFacturaAction,
  getFacturaPdfAction,
  retryVerifactuSendAction,
} from '@/src/modules/facturacion/application/facturacion-actions'
import type {
  Invoice,
  InvoiceLineInput,
  VerifactuState,
} from '@/src/modules/facturacion/domain/types'

const VERIFACTU_BADGE_CLASSES: Record<VerifactuState, string> = {
  unknown: 'bg-muted text-muted-foreground',
  not_sent: 'bg-muted text-muted-foreground',
  queued: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  sent_pending:
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  registered:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  registered_with_errors:
    'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  cancelled: 'bg-muted text-muted-foreground line-through',
}

const CURRENCY_FORMAT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

type FacturasStateViewProps = {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function FacturasStateView({
  title,
  description,
  variant = 'default',
}: FacturasStateViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {facturas.title}
        </h1>
      </header>
      <div
        className={cn(
          'portal-home-card rounded-xl px-6 py-10 text-center',
          variant === 'destructive' && 'border-destructive/30'
        )}
      >
        <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function VerifactuBadge({ state }: { state: VerifactuState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        VERIFACTU_BADGE_CLASSES[state]
      )}
    >
      {facturas.verifactuStates[state]}
    </span>
  )
}

type DraftLineForm = InvoiceLineInput & { key: number }

function emptyLine(key: number): DraftLineForm {
  return { key, description: '', quantity: 1, priceUnit: 0 }
}

type FacturaCreateFormProps = {
  onCreated: () => void
  onClose: () => void
}

function FacturaCreateForm({ onCreated, onClose }: FacturaCreateFormProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerVat, setCustomerVat] = useState('')
  const [lines, setLines] = useState<DraftLineForm[]>([emptyLine(0)])
  const [isPending, startTransition] = useTransition()

  const updateLine = (key: number, patch: Partial<InvoiceLineInput>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createFacturaDraftAction({
        draft: {
          customer: {
            name: customerName,
            vat: customerVat.trim() || undefined,
          },
          lines: lines.map(({ description, quantity, priceUnit }) => ({
            description,
            quantity,
            priceUnit,
          })),
        },
      })

      if (!result.ok) {
        toast.error(result.message ?? facturas.toasts.genericError)
        return
      }

      toast.success(facturas.toasts.draftCreated)
      onCreated()
    })
  }

  return (
    <section className="portal-home-card rounded-xl px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{facturas.form.customerName}</span>
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{facturas.form.customerVat}</span>
          <input
            type="text"
            value={customerVat}
            onChange={(event) => setCustomerVat(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {lines.map((line) => (
          <div key={line.key} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {facturas.form.lineDescription}
              </span>
              <input
                type="text"
                value={line.description}
                onChange={(event) =>
                  updateLine(line.key, { description: event.target.value })
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="flex w-24 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {facturas.form.lineQuantity}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={line.quantity}
                onChange={(event) =>
                  updateLine(line.key, { quantity: Number(event.target.value) })
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="flex w-32 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {facturas.form.linePriceUnit}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={line.priceUnit}
                onChange={(event) =>
                  updateLine(line.key, { priceUnit: Number(event.target.value) })
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            {lines.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setLines((current) =>
                    current.filter((item) => item.key !== line.key)
                  )
                }
                className="mb-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-destructive"
                aria-label={facturas.form.removeLine}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setLines((current) => [...current, emptyLine(Date.now())])
          }
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40"
        >
          <Plus className="size-4" aria-hidden />
          {facturas.form.addLine}
        </button>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {isPending ? facturas.form.submitting : facturas.form.submitDraft}
          </button>
        </div>
      </div>
    </section>
  )
}

type FacturasPageViewProps = {
  invoices: Invoice[]
}

export function FacturasPageView({ invoices }: FacturasPageViewProps) {
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pendingMoveId, setPendingMoveId] = useState<number | null>(null)

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => b.id - a.id),
    [invoices]
  )

  const runAction = (moveId: number, action: () => Promise<void>) => {
    setPendingMoveId(moveId)
    startTransition(async () => {
      try {
        await action()
      } finally {
        setPendingMoveId(null)
      }
    })
  }

  const handleEmit = (invoice: Invoice) => {
    runAction(invoice.id, async () => {
      const result = await emitFacturaAction({ moveId: invoice.id })
      if (!result.ok) {
        toast.error(result.message ?? facturas.toasts.genericError)
      } else {
        toast.success(facturas.toasts.emitted)
      }
      router.refresh()
    })
  }

  const handleRetrySend = (invoice: Invoice) => {
    runAction(invoice.id, async () => {
      const result = await retryVerifactuSendAction({ moveId: invoice.id })
      if (!result.ok) {
        toast.error(result.message ?? facturas.toasts.genericError)
      } else {
        toast.success(facturas.toasts.sendRetried)
      }
      router.refresh()
    })
  }

  const handleCancel = (invoice: Invoice) => {
    if (!window.confirm(facturas.actions.confirmCancel)) return
    runAction(invoice.id, async () => {
      const result = await cancelOrRectifyFacturaAction({
        moveId: invoice.id,
        mode: 'cancel',
      })
      if (!result.ok) {
        toast.error(result.message ?? facturas.toasts.genericError)
      } else {
        toast.success(facturas.toasts.cancelled)
      }
      router.refresh()
    })
  }

  const handleRectify = (invoice: Invoice) => {
    runAction(invoice.id, async () => {
      const result = await cancelOrRectifyFacturaAction({
        moveId: invoice.id,
        mode: 'refund',
      })
      if (!result.ok) {
        toast.error(result.message ?? facturas.toasts.genericError)
      } else {
        toast.success(facturas.toasts.rectified)
      }
      router.refresh()
    })
  }

  const handleDownloadPdf = (invoice: Invoice) => {
    runAction(invoice.id, async () => {
      const result = await getFacturaPdfAction({ moveId: invoice.id })
      if (!result.ok) {
        toast.error(result.message ?? facturas.toasts.genericError)
        return
      }

      const bytes = Uint8Array.from(atob(result.data.dataBase64), (char) =>
        char.charCodeAt(0)
      )
      const blob = new Blob([bytes], { type: result.data.mimetype })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.data.filename
      anchor.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {facturas.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {facturas.description}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40"
          >
            <RefreshCw className="size-4" aria-hidden />
            {facturas.refresh}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden />
            {facturas.newInvoice}
          </button>
        </div>
      </header>

      {showCreateForm ? (
        <FacturaCreateForm
          onCreated={() => {
            setShowCreateForm(false)
            router.refresh()
          }}
          onClose={() => setShowCreateForm(false)}
        />
      ) : null}

      {!sortedInvoices.length ? (
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-lg font-semibold text-foreground">
            {facturas.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {facturas.emptyDescription}
          </p>
        </div>
      ) : (
        <section className="portal-home-card overflow-x-auto rounded-xl">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">{facturas.columns.number}</th>
                <th className="px-4 py-3">{facturas.columns.customer}</th>
                <th className="px-4 py-3">{facturas.columns.date}</th>
                <th className="px-4 py-3 text-right">{facturas.columns.total}</th>
                <th className="px-4 py-3">{facturas.columns.verifactu}</th>
                <th className="px-4 py-3 text-right">{facturas.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((invoice) => {
                const busy = isPending && pendingMoveId === invoice.id
                return (
                  <tr key={invoice.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {invoice.name}
                      {invoice.status === 'draft' ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({facturas.invoiceStates.draft})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {invoice.customerName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {invoice.invoiceDate ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {CURRENCY_FORMAT.format(invoice.amountTotal)}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.status === 'draft' ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <VerifactuBadge state={invoice.verifactuState} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {invoice.status === 'draft' ? (
                          <button
                            type="button"
                            onClick={() => handleEmit(invoice)}
                            disabled={busy}
                            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
                          >
                            {busy
                              ? facturas.actions.emitting
                              : facturas.actions.emit}
                          </button>
                        ) : null}
                        {invoice.status === 'posted' &&
                        invoice.verifactuState === 'not_sent' ? (
                          <button
                            type="button"
                            onClick={() => handleRetrySend(invoice)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground disabled:opacity-60"
                            title={facturas.actions.retrySend}
                          >
                            <FileWarning className="size-3.5" aria-hidden />
                            {facturas.actions.retrySend}
                          </button>
                        ) : null}
                        {invoice.status === 'posted' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(invoice)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground disabled:opacity-60"
                            >
                              <Download className="size-3.5" aria-hidden />
                              {facturas.actions.downloadPdf}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRectify(invoice)}
                              disabled={busy}
                              className="rounded-md border border-border px-2 py-1 text-xs text-foreground disabled:opacity-60"
                            >
                              {facturas.actions.rectify}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(invoice)}
                              disabled={busy}
                              className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive disabled:opacity-60"
                            >
                              {facturas.actions.cancel}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
