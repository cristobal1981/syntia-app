'use client'

import { useId, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { formatIsoDateEs } from '@/lib/format/date'
import { removeParty, saveParty } from '@/src/modules/facturacion/domain/invoicing-state'
import { formatCents } from '@/src/modules/facturacion/domain/money'
import {
  canDeleteParty,
  emptyParty,
  findSimilarParties,
  partiesWithStats,
  type Party,
} from '@/src/modules/facturacion/domain/party-directory'
import { sectionHref, SECTIONS } from '@/src/modules/facturacion/domain/sections'
import { normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import { runInvoicingOperation } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { LifecyclePills } from '@/src/modules/facturacion/ui/invoice-badges'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { TramiteDrawerField } from '@/src/modules/tramites/ui/tramite-drawer-field'
import { NotFoundState } from '@/src/modules/facturacion/ui/not-found-state'

const copy = facturacion.partyPages
const partiesHref = sectionHref(SECTIONS.find((section) => section.id === 'parties')!)
const invoicesHref = sectionHref(SECTIONS.find((section) => section.id === 'invoices')!)

type PartyFormPageProps = { mode: 'new' } | { mode: 'edit'; partyId: string }

export function PartyFormPage(props: PartyFormPageProps) {
  const router = useRouter()
  const baseId = useId()
  const { parties, allInvoices } = useFacturacion()

  const existing = props.mode === 'edit' ? (parties.find((party) => party.id === props.partyId) ?? null) : null
  const [values, setValues] = useState<Party>(() =>
    existing ?? { ...emptyParty(), id: `tercero-${Date.now().toString(36)}` }
  )
  const [errors, setErrors] = useState<Partial<Record<keyof Party, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patch = (partial: Partial<Party>) => setValues((current) => ({ ...current, ...partial }))

  if (props.mode === 'edit' && !existing) {
    return (
      <NotFoundState
        title={copy.notFound.title}
        description={copy.notFound.description}
        backHref={partiesHref}
        backLabel={copy.back}
      />
    )
  }

  const stats = existing ? partiesWithStats([existing], allInvoices)[0] : null
  const related = existing
    ? allInvoices.filter((invoice) => normalizeTaxId(invoice.counterpartyTaxId) === normalizeTaxId(existing.taxId))
    : []
  const similar = existing ? [] : findSimilarParties(values, parties)
  const deletable = existing ? canDeleteParty(existing, allInvoices) : false

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const candidate: Party = { ...values, taxId: normalizeTaxId(values.taxId), paymentTermDays: Number(values.paymentTermDays) }
    const result = runInvoicingOperation((state, context) => saveParty(state, candidate, context))
    if (!result.ok) {
      setErrors(Object.fromEntries(Object.entries(result.errors).map(([field, key]) => [field, copy.errors[key]])))
      return
    }
    setErrors({})
    toast.success(copy.saved)
    router.push(partiesHref)
  }

  const handleDelete = () => {
    if (!existing) return
    const result = runInvoicingOperation((state, context) => removeParty(state, existing.id, context))
    if (!result.ok) {
      toast.error(copy.inUse)
      return
    }
    toast.success(copy.deleted)
    router.push(partiesHref)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={partiesHref}>
            <ArrowLeft aria-hidden />
            {copy.back}
          </Link>
        </Button>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {existing ? values.name || copy.editTitle : copy.new}
        </h1>
        {stats ? (
          <dl className="grid max-w-xl grid-cols-3 gap-3">
            {[
              [copy.stats.invoices, String(stats.invoiceCount)],
              [copy.stats.billed, formatCents(stats.billedCents)],
              [copy.stats.pending, formatCents(stats.pendingCents)],
            ].map(([label, value]) => (
              <div key={label} className="portal-home-card rounded-xl px-4 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-sans text-lg font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form className="flex min-w-0 flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <fieldset className="flex flex-col gap-4 border-0 p-0">
            <legend className="text-sm font-semibold text-foreground">{copy.sections.identity}</legend>
            <TramiteDrawerField id={`${baseId}-name`} name="name" label={copy.fields.name} value={values.name} error={errors.name} required onChange={(name) => patch({ name })} />
            <TramiteDrawerField id={`${baseId}-taxid`} name="taxId" label={copy.fields.taxId} value={values.taxId} error={errors.taxId} required onChange={(taxId) => patch({ taxId })} />
            {similar.length > 0 ? (
              <div role="status" className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm dark:border-border/60">
                <p className="font-medium text-foreground">{copy.similar.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{copy.similar.hint}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {similar.map((party) => (
                    <li key={party.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 text-foreground">
                        {party.name} <span className="text-muted-foreground">· {party.taxId}</span>
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`${partiesHref}/${party.id}`}>{copy.similar.use}</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </fieldset>
          <fieldset className="flex flex-col gap-4 border-0 p-0">
            <legend className="text-sm font-semibold text-foreground">{copy.sections.address}</legend>
            <TramiteDrawerField id={`${baseId}-address`} name="address" label={copy.fields.address} value={values.address} onChange={(address) => patch({ address })} />
            <div className="grid gap-4 sm:grid-cols-3">
              <TramiteDrawerField id={`${baseId}-postal`} name="postalCode" label={copy.fields.postalCode} value={values.postalCode} error={errors.postalCode} onChange={(postalCode) => patch({ postalCode })} />
              <TramiteDrawerField id={`${baseId}-city`} name="city" label={copy.fields.city} value={values.city} onChange={(city) => patch({ city })} />
              <TramiteDrawerField id={`${baseId}-province`} name="province" label={copy.fields.province} value={values.province} onChange={(province) => patch({ province })} />
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-4 border-0 p-0">
            <legend className="text-sm font-semibold text-foreground">{copy.sections.contact}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TramiteDrawerField id={`${baseId}-email`} name="email" type="email" label={copy.fields.email} value={values.email} error={errors.email} onChange={(email) => patch({ email })} />
              <TramiteDrawerField id={`${baseId}-phone`} name="phone" label={copy.fields.phone} value={values.phone} onChange={(phone) => patch({ phone })} />
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-4 border-0 p-0">
            <legend className="text-sm font-semibold text-foreground">{copy.sections.billing}</legend>
            <TramiteDrawerField
              id={`${baseId}-term`}
              name="paymentTermDays"
              type="number"
              label={copy.fields.paymentTermDays}
              value={String(values.paymentTermDays)}
              error={errors.paymentTermDays}
              onChange={(paymentTermDays) => patch({ paymentTermDays: Number(paymentTermDays) })}
            />
            <TramiteDrawerField id={`${baseId}-notes`} name="notes" label={copy.fields.notes} value={values.notes} onChange={(notes) => patch({ notes })} />
          </fieldset>

          {existing ? <p className="text-xs text-muted-foreground">{copy.snapshotNote}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 dark:border-border/60">
            {existing ? (
              <Button type="button" variant="ghost" className="text-destructive" disabled={!deletable} title={deletable ? undefined : copy.inUse} onClick={() => setConfirmDelete(true)}>
                {copy.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={partiesHref}>{facturacion.editor.cancel}</Link>
              </Button>
              <Button type="submit">{copy.save}</Button>
            </div>
          </div>
        </form>

        {existing ? (
          <section className="portal-home-card h-fit rounded-xl p-4 sm:p-5" aria-label={copy.invoicesTitle}>
            <h2 className="font-sans text-base font-semibold text-foreground">{copy.invoicesTitle}</h2>
            {related.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{copy.noInvoices}</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-border dark:divide-border/50">
                {[...related]
                  .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
                  .map((invoice) => (
                    <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <span className="min-w-0">
                        <Link href={`${invoicesHref}/${invoice.id}`} className="font-medium text-foreground underline underline-offset-4">
                          {invoice.invoiceNumber || facturacion.document.pendingNumber}
                        </Link>
                        <span className="ml-2 text-muted-foreground">{formatIsoDateEs(invoice.issueDate)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <LifecyclePills invoice={invoice} />
                        <span className="tabular-nums text-foreground">{formatCents(invoice.totalCents)}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <PortalConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={copy.deleteTitle}
        description={copy.deleteBody}
        confirmLabel={copy.delete}
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
