'use client'

import { useId, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { categories } from '@/src/modules/facturacion/domain/categories'
import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { addDaysIso } from '@/src/modules/facturacion/domain/dates'
import type { EmissionIssue } from '@/src/modules/facturacion/domain/emission'
import {
  draftFromForm,
  emptyInvoiceForm,
  formFromInvoice,
  validateInvoiceForm,
  type InvoiceFormValues,
} from '@/src/modules/facturacion/domain/invoice-form'
import { isLocked } from '@/src/modules/facturacion/domain/invoice-rules'
import { emitDraft, saveInvoice } from '@/src/modules/facturacion/domain/invoicing-state'
import { formatCents, parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import { formatPartyAddress } from '@/src/modules/facturacion/domain/party-directory'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import { DEFAULT_TAX_RATE, taxRatesFor, WITHHOLDING_RATES } from '@/src/modules/facturacion/domain/tax-rates'
import type { TaxRegime } from '@/src/modules/facturacion/domain/types'
import { runInvoicingOperation } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { TramiteDrawerField, TramiteDrawerSelect } from '@/src/modules/tramites/ui/tramite-drawer-field'
import { NotFoundState } from '@/src/modules/facturacion/ui/not-found-state'

const copy = facturacion.editor
const pageCopy = facturacion.page.form
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)

function rateLabel(rate: number): string {
  return `${String(rate).replace('.', ',')} %`
}

function rateOptions(rates: readonly number[]): Record<string, string> {
  return Object.fromEntries(rates.map((rate) => [String(rate), rateLabel(rate)]))
}

type InvoiceFormPageProps = { mode: 'new' } | { mode: 'edit'; invoiceId: string }

/** Alta y edición de una factura a pantalla completa. */
export function InvoiceFormPage(props: InvoiceFormPageProps) {
  const router = useRouter()
  const baseId = useId()
  const { allInvoices, parties } = useFacturacion()

  const existing = props.mode === 'edit' ? (allInvoices.find((invoice) => invoice.id === props.invoiceId) ?? null) : null
  const [values, setValues] = useState<InvoiceFormValues>(() => (existing ? formFromInvoice(existing) : emptyInvoiceForm()))
  const [errors, setErrors] = useState<Partial<Record<keyof InvoiceFormValues, string>>>({})
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [emitIssues, setEmitIssues] = useState<EmissionIssue[]>([])

  if (props.mode === 'edit' && !existing) {
    return (
      <NotFoundState
        title={facturacion.page.detail.notFound.title}
        description={facturacion.page.detail.notFound.description}
        backHref={invoicesHref}
        backLabel={facturacion.page.back}
      />
    )
  }

  if (existing && isLocked(existing)) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`${invoicesHref}/${existing.id}`}>
            <ArrowLeft aria-hidden />
            {facturacion.page.back}
          </Link>
        </Button>
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Lock className="size-4" aria-hidden />
          {pageCopy.issuedLocked}
        </p>
      </div>
    )
  }

  const fields = copy.fields
  const editingId = existing?.id ?? savedId

  const patch = (partial: Partial<InvoiceFormValues>) => setValues((current) => ({ ...current, ...partial }))

  const changeRegime = (regime: string) => {
    if (regime !== 'igic' && regime !== 'iva') return
    const next: TaxRegime = regime
    patch({ regime: next, taxRate: String(DEFAULT_TAX_RATE[next]) })
  }

  const pickParty = (partyId: string) => {
    const party = parties.find((candidate) => candidate.id === partyId)
    if (!party) return
    patch({
      counterpartyName: party.name,
      counterpartyTaxId: party.taxId,
      counterpartyAddress: formatPartyAddress(party),
      dueDate: values.issueDate ? addDaysIso(values.issueDate, party.paymentTermDays) : values.dueDate,
    })
  }

  const amounts = computeInvoiceAmounts(
    Math.max(parseAmountToCents(values.base) ?? 0, 0),
    Number(values.taxRate),
    Number(values.withholdingRate)
  )

  const save = (andEmit: boolean) => {
    if (saving) return
    const found = validateInvoiceForm(values)
    if (Object.keys(found).length > 0) {
      setErrors(Object.fromEntries(Object.entries(found).map(([field, key]) => [field, copy.errors[key]])))
      return
    }
    setErrors({})
    setEmitIssues([])
    setSaving(true)

    const draft = draftFromForm(values, existing?.source ?? 'manual')
    const saved = runInvoicingOperation((state, context) => saveInvoice(state, draft, context, editingId ?? undefined))
    if (!saved.ok) {
      setSaving(false)
      toast.error(pageCopy.issuedLocked)
      return
    }

    setSavedId(saved.invoice.id)

    if (andEmit) {
      const emitted = runInvoicingOperation((state, context) => emitDraft(state, saved.invoice.id, context))
      if (!emitted.ok && emitted.error === 'invalid') {
        setEmitIssues(emitted.issues)
        setSaving(false)
        return
      }
      if (emitted.ok) toast.success(facturacion.page.detail.emitted(emitted.invoice.invoiceNumber))
    } else {
      toast.success(pageCopy.saved)
    }

    router.push(`${invoicesHref}/${saved.invoice.id}`)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    save(false)
  }

  const title = existing ? pageCopy.editTitle : facturacion.page.newInvoice

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={existing ? `${invoicesHref}/${existing.id}` : invoicesHref}>
            <ArrowLeft aria-hidden />
            {facturacion.page.back}
          </Link>
        </Button>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <form className="flex min-w-0 max-w-3xl flex-col gap-6" onSubmit={handleSubmit} noValidate aria-label={title}>
        {emitIssues.length > 0 ? (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            <ul className="list-disc space-y-0.5 pl-5 text-foreground">
              {emitIssues.map((issue) => (
                <li key={`${issue.code}-${issue.field}`}>{facturacion.page.detail.emitIssues[issue.code]}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <fieldset className="flex flex-col gap-4 border-0 p-0">
          <legend className="text-sm font-semibold text-foreground">{copy.sections.identification}</legend>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {pageCopy.lockedFields}
          </p>
          <TramiteDrawerField
            id={`${baseId}-date`}
            name="issueDate"
            type="date"
            label={fields.issueDate}
            value={values.issueDate}
            error={errors.issueDate}
            required
            onChange={(issueDate) => patch({ issueDate })}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-0 p-0">
          <legend className="text-sm font-semibold text-foreground">{copy.sections.counterparty}</legend>
          <TramiteDrawerSelect
            id={`${baseId}-party`}
            name="party"
            label={pageCopy.pickParty}
            placeholder={pageCopy.pickPartyPlaceholder}
            value=""
            options={Object.fromEntries(parties.map((party) => [party.id, party.name]))}
            onChange={pickParty}
          />
          <p className="-mt-2 text-xs text-muted-foreground">{pageCopy.pickPartyHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TramiteDrawerField
              id={`${baseId}-name`}
              name="counterpartyName"
              label={fields.counterpartyName}
              value={values.counterpartyName}
              error={errors.counterpartyName}
              required
              onChange={(counterpartyName) => patch({ counterpartyName })}
            />
            <TramiteDrawerField
              id={`${baseId}-taxid`}
              name="counterpartyTaxId"
              label={fields.counterpartyTaxId}
              value={values.counterpartyTaxId}
              error={errors.counterpartyTaxId}
              onChange={(counterpartyTaxId) => patch({ counterpartyTaxId })}
            />
          </div>
          <TramiteDrawerField
            id={`${baseId}-address`}
            name="counterpartyAddress"
            label={pageCopy.fields.counterpartyAddress}
            value={values.counterpartyAddress}
            onChange={(counterpartyAddress) => patch({ counterpartyAddress })}
          />
          <TramiteDrawerField
            id={`${baseId}-concept`}
            name="concept"
            label={fields.concept}
            value={values.concept}
            onChange={(concept) => patch({ concept })}
          />
          <TramiteDrawerSelect
            id={`${baseId}-category`}
            name="categoryId"
            label={fields.category}
            placeholder=""
            value={values.categoryId}
            options={Object.fromEntries(categories().map((category) => [category.id, category.label]))}
            onChange={(categoryId) => patch({ categoryId })}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-0 p-0">
          <legend className="text-sm font-semibold text-foreground">{copy.sections.amounts}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <TramiteDrawerSelect
              id={`${baseId}-regime`}
              name="regime"
              label={fields.regime}
              placeholder=""
              value={values.regime}
              options={copy.regimes}
              onChange={changeRegime}
            />
            <TramiteDrawerSelect
              id={`${baseId}-rate`}
              name="taxRate"
              label={fields.taxRate}
              placeholder=""
              value={values.taxRate}
              options={rateOptions(taxRatesFor(values.regime))}
              onChange={(taxRate) => patch({ taxRate })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TramiteDrawerField
              id={`${baseId}-base`}
              name="base"
              label={fields.base}
              value={values.base}
              error={errors.base}
              required
              onChange={(base) => patch({ base })}
            />
            <TramiteDrawerSelect
              id={`${baseId}-withholding`}
              name="withholdingRate"
              label={fields.withholdingRate}
              placeholder=""
              value={values.withholdingRate}
              options={rateOptions(WITHHOLDING_RATES)}
              onChange={(withholdingRate) => patch({ withholdingRate })}
            />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{copy.hints.withholding}</p>
          <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{copy.computed.tax}</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatCents(amounts.taxCents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{copy.computed.withholding}</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatCents(amounts.withholdingCents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{copy.computed.total}</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatCents(amounts.totalCents)}</dd>
            </div>
          </dl>
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-0 p-0">
          <legend className="text-sm font-semibold text-foreground">{copy.sections.payment}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <TramiteDrawerField
              id={`${baseId}-due`}
              name="dueDate"
              type="date"
              label={fields.dueDate}
              value={values.dueDate}
              error={errors.dueDate}
              onChange={(dueDate) => patch({ dueDate })}
            />
            <TramiteDrawerField
              id={`${baseId}-payment`}
              name="paymentDate"
              type="date"
              label={fields.paymentDate}
              value={values.paymentDate}
              error={errors.paymentDate}
              onChange={(paymentDate) => patch({ paymentDate })}
            />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{copy.hints.dueDate} {copy.hints.paymentDate}</p>
        </fieldset>

        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur dark:border-border/60">
          <Button asChild variant="outline" disabled={saving}>
            <Link href={existing ? `${invoicesHref}/${existing.id}` : invoicesHref}>{copy.cancel}</Link>
          </Button>
          <Button type="submit" variant="outline" disabled={saving} aria-busy={saving}>
            {saving ? copy.saving : pageCopy.saveDraft}
          </Button>
          <Button type="button" disabled={saving} onClick={() => save(true)}>
            {pageCopy.saveAndEmit}
          </Button>
        </div>
      </form>
    </div>
  )
}
