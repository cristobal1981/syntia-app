'use client'

import { useId, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import { rectifyInvoice } from '@/src/modules/facturacion/domain/invoicing-state'
import { formatCents, parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import {
  buildRectificationDraft,
  canRectify,
  netAmountsAfterRectification,
  validateRectification,
  type RectificationInput,
} from '@/src/modules/facturacion/domain/rectification'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import { runInvoicingOperation } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { TramiteDrawerField, TramiteDrawerSelect } from '@/src/modules/tramites/ui/tramite-drawer-field'
import { NotFoundState } from '@/src/modules/facturacion/ui/not-found-state'

const copy = facturacion.page.rectify
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)

type Mode = 'total' | 'parcial'

export function RectifyPage({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const baseId = useId()
  const { allInvoices, today } = useFacturacion()
  const [mode, setMode] = useState<Mode>('total')
  const [reason, setReason] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [delta, setDelta] = useState('')
  const [messages, setMessages] = useState<string[]>([])

  const original = allInvoices.find((invoice) => invoice.id === invoiceId) ?? null

  const input = useMemo<RectificationInput>(() => {
    const deltaBaseCents = parseAmountToCents(delta) ?? 0
    return mode === 'total' ? { mode, reason, issueDate } : { mode, reason, issueDate, deltaBaseCents }
  }, [mode, reason, issueDate, delta])

  const draft = useMemo(() => (original ? buildRectificationDraft(original, allInvoices, input) : null), [original, allInvoices, input])
  const net = original ? netAmountsAfterRectification(original, allInvoices) : null

  const back = (
    <Button asChild variant="ghost" size="sm" className="w-fit">
      <Link href={original ? `${invoicesHref}/${original.id}` : invoicesHref}>
        <ArrowLeft aria-hidden />
        {facturacion.page.back}
      </Link>
    </Button>
  )

  if (!original) {
    return (
      <NotFoundState
        title={facturacion.page.detail.notFound.title}
        description={facturacion.page.detail.notFound.description}
        backHref={invoicesHref}
        backLabel={facturacion.page.back}
      />
    )
  }

  if (!canRectify(original)) {
    return (
      <div className="flex flex-col items-start gap-4">
        {back}
        <p className="text-sm text-foreground">{copy.issues.not_rectifiable}</p>
      </div>
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const issues = validateRectification(original, allInvoices, input)
    if (issues.length > 0) {
      setMessages(issues.map((issue) => copy.issues[issue]))
      return
    }

    const result = runInvoicingOperation((state, context) => rectifyInvoice(state, original.id, input, context))
    if (result.ok) {
      toast.success(copy.issued(result.invoice.invoiceNumber))
      router.push(`${invoicesHref}/${result.invoice.id}`)
      return
    }
    if (result.error === 'invalid') setMessages(result.issues.map((issue) => copy.issues[issue]))
    else if (result.error === 'emission') setMessages(result.issues.map((issue) => facturacion.page.detail.emitIssues[issue.code]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {back}
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">{copy.title(original.invoiceNumber)}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {messages.length > 0 ? (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <ul className="list-disc space-y-0.5 pl-5 text-foreground">
                {messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <TramiteDrawerSelect
            id={`${baseId}-mode`}
            name="mode"
            label={copy.mode}
            placeholder=""
            value={mode}
            options={{ total: copy.total, parcial: copy.partial }}
            onChange={(value) => setMode(value === 'parcial' ? 'parcial' : 'total')}
          />
          {mode === 'parcial' ? (
            <>
              <TramiteDrawerField
                id={`${baseId}-delta`}
                name="delta"
                label={copy.delta}
                value={delta}
                onChange={setDelta}
              />
              <p className="-mt-3 text-xs text-muted-foreground">{copy.deltaHint}</p>
            </>
          ) : null}
          <TramiteDrawerField
            id={`${baseId}-date`}
            name="issueDate"
            type="date"
            label={copy.date}
            value={issueDate}
            onChange={setIssueDate}
          />
          <TramiteDrawerField
            id={`${baseId}-reason`}
            name="reason"
            label={copy.reason}
            placeholder={copy.reasonPlaceholder}
            value={reason}
            required
            onChange={setReason}
          />

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4 dark:border-border/60">
            <Button asChild variant="outline">
              <Link href={`${invoicesHref}/${original.id}`}>{facturacion.editor.cancel}</Link>
            </Button>
            <Button type="submit">{copy.submit}</Button>
          </div>
        </form>

        <section className="portal-home-card h-fit rounded-xl p-4 sm:p-5" aria-label={copy.preview}>
          <h2 className="font-sans text-base font-semibold text-foreground">{copy.preview}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {original.invoiceNumber} · {formatIsoDateEs(original.issueDate)} · {original.counterpartyName}
          </p>
          {draft ? (
            <dl className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border text-sm dark:divide-border/50">
              <div className="flex justify-between px-4 py-2">
                <dt className="text-muted-foreground">{facturacion.detail.fields.base}</dt>
                <dd className="tabular-nums text-foreground">{formatCents(draft.baseCents)}</dd>
              </div>
              <div className="flex justify-between px-4 py-2">
                <dt className="text-muted-foreground">{facturacion.detail.fields.tax(draft.regime === 'igic' ? 'IGIC' : 'IVA', `${String(draft.taxRate).replace('.', ',')} %`)}</dt>
                <dd className="tabular-nums text-foreground">{formatCents(draft.taxCents)}</dd>
              </div>
              {draft.withholdingCents !== 0 ? (
                <div className="flex justify-between px-4 py-2">
                  <dt className="text-muted-foreground">{facturacion.detail.fields.withholding(`${String(draft.withholdingRate).replace('.', ',')} %`)}</dt>
                  <dd className="tabular-nums text-foreground">{formatCents(-draft.withholdingCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between bg-muted/40 px-4 py-2 font-semibold">
                <dt className="text-foreground">{facturacion.detail.fields.total}</dt>
                <dd className="tabular-nums text-foreground">{formatCents(draft.totalCents)}</dd>
              </div>
            </dl>
          ) : null}
          {net && draft ? (
            <p className="mt-4 flex items-center justify-between text-sm font-semibold text-foreground">
              <span>{copy.net}</span>
              <span className="tabular-nums">{formatCents(net.totalCents + draft.totalCents)}</span>
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
