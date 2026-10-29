'use client'

import { useId, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { categories } from '@/src/modules/facturacion/domain/categories'
import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { addDaysIso, localIsoDate } from '@/src/modules/facturacion/domain/dates'
import type { EmissionIssue } from '@/src/modules/facturacion/domain/emission'
import {
  centsToInput,
  draftFromForm,
  emptyFormLine,
  emptyInvoiceForm,
  formFromInvoice,
  formLinesBaseCents,
  validateFormLines,
  validateInvoiceForm,
  type InvoiceFormLine,
  type InvoiceFormValues,
} from '@/src/modules/facturacion/domain/invoice-form'
import { lineTotalCents, parseQuantity } from '@/src/modules/facturacion/domain/invoice-lines'
import { isLocked } from '@/src/modules/facturacion/domain/invoice-rules'
import { emitDraft, saveInvoice, saveParty } from '@/src/modules/facturacion/domain/invoicing-state'
import { formatCents, parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import { emptyParty, formatPartyAddress, type Party } from '@/src/modules/facturacion/domain/party-directory'
import { normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import { CLIENT_KINDS, clientKindFromTaxId, TERRITORIES, type ClientKind, type Territory } from '@/src/modules/facturacion/domain/tax-profile'
import { issuerTaxProfile, resolveTax } from '@/src/modules/facturacion/domain/tax-rules'
import { PAYMENT_METHODS, type PaymentMethod } from '@/src/modules/facturacion/domain/types'
import { runInvoicingOperation } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { TramiteDrawerField, TramiteDrawerSelect } from '@/src/modules/tramites/ui/tramite-drawer-field'
import { FormSection } from '@/src/modules/facturacion/ui/form-section'
import { NotFoundState } from '@/src/modules/facturacion/ui/not-found-state'

const copy = facturacion.editor
const pageCopy = facturacion.page.form
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)

function mapLineErrors(lines: readonly InvoiceFormLine[]) {
  return Object.fromEntries(
    Object.entries(validateFormLines(lines)).map(([lineId, found]) => [
      lineId,
      Object.fromEntries(Object.entries(found).map(([field, key]) => [field, copy.lines.errors[key]])),
    ])
  )
}

function rateLabel(rate: number): string {
  return `${String(rate).replace('.', ',')} %`
}


type InvoiceFormPageProps = { mode: 'new' } | { mode: 'edit'; invoiceId: string }

/** Alta y edición de una factura a pantalla completa. */
export function InvoiceFormPage(props: InvoiceFormPageProps) {
  const router = useRouter()
  const baseId = useId()
  const { allInvoices, parties, products, issuer } = useFacturacion()

  const existing = props.mode === 'edit' ? (allInvoices.find((invoice) => invoice.id === props.invoiceId) ?? null) : null
  const [values, setValues] = useState<InvoiceFormValues>(() => (existing ? formFromInvoice(existing) : emptyInvoiceForm()))
  const [errors, setErrors] = useState<Partial<Record<keyof InvoiceFormValues, string>>>({})
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [emitIssues, setEmitIssues] = useState<EmissionIssue[]>([])
  const [lineErrors, setLineErrors] = useState<Record<string, Partial<Record<'description' | 'quantity' | 'unitPrice', string>>>>({})
  const [quickParty, setQuickParty] = useState<{ name: string; taxId: string; address: string } | null>(null)
  const [quickErrors, setQuickErrors] = useState<Partial<Record<keyof Party, string>>>({})

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

  const pickParty = (partyId: string, created?: Party) => {
    const party = created ?? parties.find((candidate) => candidate.id === partyId)
    if (!party) return
    patch({
      counterpartyName: party.name,
      counterpartyTaxId: party.taxId,
      counterpartyAddress: formatPartyAddress(party),
      counterpartyTerritory: party.territory,
      counterpartyKind: party.kind,
      dueDate: values.issueDate ? addDaysIso(values.issueDate, party.paymentTermDays) : values.dueDate,
    })
  }

  const patchLine = (lineId: string, partial: Partial<InvoiceFormLine>) =>
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, ...partial } : line)),
    }))

  const removeLine = (lineId: string) =>
    setValues((current) => ({ ...current, lines: current.lines.filter((line) => line.id !== lineId) }))

  const addBlankLine = () => setValues((current) => ({ ...current, lines: [...current.lines, emptyFormLine()] }))

  /** Añade una línea con el nombre y el precio del producto; si la única línea está vacía, la sustituye. */
  const addProductLine = (productId: string) => {
    const product = products.find((candidate) => candidate.id === productId)
    if (!product) return
    const line: InvoiceFormLine = {
      ...emptyFormLine(),
      productId: product.id,
      description: product.name,
      unitPrice: centsToInput(product.priceCents),
    }
    setValues((current) => {
      const onlyBlank = current.lines.length === 1 && !current.lines[0].description.trim() && !current.lines[0].unitPrice.trim()
      return { ...current, lines: onlyBlank ? [line] : [...current.lines, line] }
    })
  }

  const createQuickParty = () => {
    if (!quickParty) return
    const party: Party = {
      ...emptyParty(),
      id: `tercero-${Date.now().toString(36)}`,
      name: quickParty.name.trim(),
      taxId: normalizeTaxId(quickParty.taxId),
      address: quickParty.address.trim(),
      territory: issuerTaxProfile(issuer).territory,
      kind: clientKindFromTaxId(quickParty.taxId),
    }
    const result = runInvoicingOperation((state, context) => saveParty(state, party, context))
    if (!result.ok) {
      setQuickErrors(
        Object.fromEntries(Object.entries(result.errors).map(([field, key]) => [field, facturacion.partyPages.errors[key]]))
      )
      return
    }
    setQuickErrors({})
    setQuickParty(null)
    pickParty(party.id, party)
    toast.success(pageCopy.quickParty.created)
  }

  const baseCents = formLinesBaseCents(values.lines)
  const tax = resolveTax(issuerTaxProfile(issuer), { territory: values.counterpartyTerritory, kind: values.counterpartyKind })
  const amounts = computeInvoiceAmounts(baseCents, tax.taxRate, tax.withholdingRate)

  const save = (andEmit: boolean) => {
    if (saving) return
    const found = validateInvoiceForm(values)
    if (Object.keys(found).length > 0) {
      setErrors(Object.fromEntries(Object.entries(found).map(([field, key]) => [field, copy.errors[key]])))
      setLineErrors(mapLineErrors(values.lines))
      return
    }
    setErrors({})
    setLineErrors({})
    setEmitIssues([])
    setSaving(true)

    const draft = draftFromForm(values, issuer, existing?.source ?? 'manual')
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
  const cancelHref = existing ? `${invoicesHref}/${existing.id}` : invoicesHref
  const withholdingLabel = tax.withholdingRate > 0 ? `${copy.computed.withholding} (${rateLabel(tax.withholdingRate)})` : copy.computed.withholding
  const actions = (
    <>
      <Button type="button" disabled={saving} onClick={() => save(true)}>
        {pageCopy.saveAndEmit}
      </Button>
      <Button type="submit" variant="outline" disabled={saving} aria-busy={saving}>
        {saving ? copy.saving : pageCopy.saveDraft}
      </Button>
      <Button asChild variant="ghost" disabled={saving}>
        <Link href={cancelHref}>{copy.cancel}</Link>
      </Button>
    </>
  )

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

      <form
        className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,44rem)_minmax(0,22rem)] xl:items-start xl:gap-12"
        onSubmit={handleSubmit}
        noValidate
        aria-label={title}
      >
        <div className="flex min-w-0 flex-col gap-8">
        {emitIssues.length > 0 ? (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            <ul className="list-disc space-y-0.5 pl-5 text-foreground">
              {emitIssues.map((issue) => (
                <li key={`${issue.code}-${issue.field}`}>{facturacion.page.detail.emitIssues[issue.code]}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <FormSection title={copy.sections.identification}>
          <p className="-mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {pageCopy.lockedFields}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
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
            <TramiteDrawerField
              id={`${baseId}-due`}
              name="dueDate"
              type="date"
              label={fields.dueDate}
              value={values.dueDate}
              error={errors.dueDate}
              onChange={(dueDate) => patch({ dueDate })}
            />
            <TramiteDrawerSelect
              id={`${baseId}-method`}
              name="paymentMethod"
              label={fields.paymentMethod}
              placeholder=""
              value={values.paymentMethod}
              options={Object.fromEntries(PAYMENT_METHODS.map((method) => [method, copy.paymentMethods[method]]))}
              onChange={(method) => patch({ paymentMethod: method as PaymentMethod })}
            />
          </div>
          {values.issueDate && values.issueDate < localIsoDate() ? (
            <>
              <TramiteDrawerField
                id={`${baseId}-date-reason`}
                name="dateReason"
                label={fields.dateReason}
                value={values.dateReason}
                error={errors.dateReason}
                required
                onChange={(dateReason) => patch({ dateReason })}
              />
              <p className="-mt-2 text-xs text-muted-foreground">{copy.hints.dateReason}</p>
            </>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <TramiteDrawerSelect
              id={`${baseId}-category`}
              name="categoryId"
              label={fields.category}
              placeholder=""
              value={values.categoryId}
              options={Object.fromEntries(categories().map((category) => [category.id, category.label]))}
              onChange={(categoryId) => patch({ categoryId })}
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
        </FormSection>

        <FormSection title={copy.sections.counterparty}>
          <div className="flex flex-wrap items-end gap-3">
            <TramiteDrawerSelect
              id={`${baseId}-party`}
              name="party"
              label={pageCopy.pickParty}
              placeholder={pageCopy.pickPartyPlaceholder}
              value=""
              className="min-w-0 flex-1 basis-64"
              options={Object.fromEntries(parties.map((party) => [party.id, party.name]))}
              onChange={pickParty}
            />
            {quickParty ? null : (
              <Button type="button" variant="outline" className="h-10" onClick={() => setQuickParty({ name: '', taxId: '', address: '' })}>
                <Plus aria-hidden />
                {pageCopy.quickParty.open}
              </Button>
            )}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{pageCopy.pickPartyHint}</p>
          {quickParty ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 dark:border-border/60">
              <p className="text-sm font-medium text-foreground">{pageCopy.quickParty.title}</p>
              <p className="-mt-2 text-xs text-muted-foreground">{pageCopy.quickParty.hint}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TramiteDrawerField
                  id={`${baseId}-quick-name`}
                  name="quickName"
                  label={pageCopy.quickParty.name}
                  value={quickParty.name}
                  error={quickErrors.name}
                  required
                  onChange={(name) => setQuickParty({ ...quickParty, name })}
                />
                <TramiteDrawerField
                  id={`${baseId}-quick-taxid`}
                  name="quickTaxId"
                  label={pageCopy.quickParty.taxId}
                  value={quickParty.taxId}
                  error={quickErrors.taxId}
                  required
                  onChange={(taxId) => setQuickParty({ ...quickParty, taxId })}
                />
              </div>
              <TramiteDrawerField
                id={`${baseId}-quick-address`}
                name="quickAddress"
                label={pageCopy.quickParty.address}
                value={quickParty.address}
                error={quickErrors.address}
                onChange={(address) => setQuickParty({ ...quickParty, address })}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuickParty(null)
                    setQuickErrors({})
                  }}
                >
                  {pageCopy.quickParty.cancel}
                </Button>
                <Button type="button" onClick={createQuickParty}>
                  {pageCopy.quickParty.save}
                </Button>
              </div>
            </div>
          ) : null}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TramiteDrawerSelect
              id={`${baseId}-territory`}
              name="counterpartyTerritory"
              label={fields.territory}
              placeholder=""
              value={values.counterpartyTerritory}
              options={Object.fromEntries(TERRITORIES.map((territory) => [territory, copy.territories[territory]]))}
              onChange={(territory) => patch({ counterpartyTerritory: territory as Territory })}
            />
            <TramiteDrawerSelect
              id={`${baseId}-kind`}
              name="counterpartyKind"
              label={fields.clientKind}
              placeholder=""
              value={values.counterpartyKind}
              options={Object.fromEntries(CLIENT_KINDS.map((kind) => [kind, copy.clientKinds[kind]]))}
              onChange={(kind) => patch({ counterpartyKind: kind as ClientKind })}
            />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{copy.taxRules.clientHint}</p>
        </FormSection>

        <FormSection title={copy.sections.lines}>
          <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_8rem_7rem_2.5rem] gap-3 text-sm font-medium text-foreground sm:grid" aria-hidden>
            <span>{copy.lines.description}</span>
            <span>{copy.lines.quantity}</span>
            <span>{copy.lines.unitPrice}</span>
            <span className="text-right">{copy.lines.amount}</span>
            <span />
          </div>
          <ul className="flex flex-col gap-3">
            {values.lines.map((line, index) => {
              const lineError = lineErrors[line.id] ?? {}
              const amount = lineTotalCents({
                quantity: parseQuantity(line.quantity) ?? 0,
                unitPriceCents: parseAmountToCents(line.unitPrice) ?? 0,
              })
              return (
                <li
                  key={line.id}
                  className="grid gap-3 max-sm:rounded-lg max-sm:border max-sm:border-border max-sm:p-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_8rem_7rem_2.5rem] sm:items-start dark:max-sm:border-border/60"
                >
                  <TramiteDrawerField
                    id={`${baseId}-line-${line.id}-description`}
                    name={`lineDescription-${index}`}
                    label={copy.lines.description}
                    labelClassName="sm:sr-only"
                    value={line.description}
                    error={lineError.description}
                    required
                    onChange={(description) => patchLine(line.id, { description })}
                  />
                  <TramiteDrawerField
                    id={`${baseId}-line-${line.id}-quantity`}
                    name={`lineQuantity-${index}`}
                    label={copy.lines.quantity}
                    labelClassName="sm:sr-only"
                    value={line.quantity}
                    error={lineError.quantity}
                    required
                    onChange={(quantity) => patchLine(line.id, { quantity })}
                  />
                  <TramiteDrawerField
                    id={`${baseId}-line-${line.id}-price`}
                    name={`lineUnitPrice-${index}`}
                    label={copy.lines.unitPrice}
                    labelClassName="sm:sr-only"
                    value={line.unitPrice}
                    error={lineError.unitPrice}
                    required
                    onChange={(unitPrice) => patchLine(line.id, { unitPrice })}
                  />
                  <div className="flex items-center justify-between sm:h-10 sm:justify-end">
                    <span className="text-sm text-muted-foreground sm:sr-only">{copy.lines.amount}</span>
                    <span className="text-sm font-medium tabular-nums text-foreground">{formatCents(amount)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="justify-self-end"
                    disabled={values.lines.length === 1}
                    aria-label={copy.lines.remove(index + 1)}
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              )
            })}
          </ul>
          {errors.lines ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.lines}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={addBlankLine}>
              <Plus aria-hidden />
              {copy.lines.add}
            </Button>
            {products.length > 0 ? (
              <TramiteDrawerSelect
                id={`${baseId}-product`}
                name="product"
                label={copy.lines.pickProduct}
                labelClassName="sr-only"
                placeholder={copy.lines.pickProductPlaceholder}
                value=""
                className="w-full sm:w-72"
                options={Object.fromEntries(products.map((product) => [product.id, product.name]))}
                onChange={addProductLine}
              />
            ) : null}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{copy.lines.hint}</p>
        </FormSection>

        </div>

        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-0" aria-label={copy.sections.amounts}>
          <section className="portal-home-card flex flex-col gap-3 rounded-xl px-5 py-4">
            <h2 className="font-sans text-base font-semibold text-foreground">{copy.sections.amounts}</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{copy.lines.subtotal}</dt>
                <dd className="tabular-nums text-foreground">{formatCents(amounts.baseCents)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{`${copy.regimes[tax.regime]} (${rateLabel(tax.taxRate)})`}</dt>
                <dd className="tabular-nums text-foreground">{formatCents(amounts.taxCents)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{withholdingLabel}</dt>
                <dd className="tabular-nums text-foreground">
                  {tax.withholdingRate > 0 ? formatCents(-amounts.withholdingCents) : copy.taxRules.noWithholding}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-3 dark:border-border/60">
                <dt className="font-medium text-foreground">{copy.computed.total}</dt>
                <dd className="font-sans text-2xl font-semibold tabular-nums text-foreground">{formatCents(amounts.totalCents)}</dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">{tax.note || copy.taxRules.hint}</p>
          </section>
          <div className="hidden flex-col gap-2 xl:flex">{actions}</div>
        </aside>

        {/* Por debajo de xl las acciones van en una barra fija al pie del área con desplazamiento. El área tiene un relleno
            de 2,5 rem abajo (más hueco para la barra inferior en móvil): -bottom-10 la pega al borde (o sobre la barra inferior). */}
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)-2.5rem)] z-10 -mx-4 flex flex-row-reverse flex-wrap items-center justify-start gap-2 border-t border-border bg-background px-4 py-3 sm:-mx-10 sm:px-10 md:-bottom-10 xl:hidden dark:border-border/60">
          {actions}
        </div>
      </form>
    </div>
  )
}
