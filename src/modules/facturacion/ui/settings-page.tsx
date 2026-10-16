'use client'

import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { validateIssuer, type Issuer } from '@/src/modules/facturacion/domain/issuer'
import { saveIssuer } from '@/src/modules/facturacion/domain/invoicing-state'
import { normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import { runInvoicingOperation } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { TramiteDrawerField } from '@/src/modules/tramites/ui/tramite-drawer-field'

const copy = facturacion.settings

export function SettingsPage() {
  const baseId = useId()
  const { issuer } = useFacturacion()
  const [values, setValues] = useState<Issuer>(issuer)
  const [errors, setErrors] = useState<Partial<Record<keyof Issuer, string>>>({})

  const patch = (partial: Partial<Issuer>) => setValues((current) => ({ ...current, ...partial }))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateIssuer(values)
    if (Object.keys(found).length > 0) {
      setErrors(Object.fromEntries(Object.entries(found).map(([field, key]) => [field, copy.errors[key]])))
      return
    }
    setErrors({})
    const clean: Issuer = { ...values, taxId: normalizeTaxId(values.taxId) }
    runInvoicingOperation((state, context) => ({ state: saveIssuer(state, clean, context) }))
    toast.success(copy.saved)
  }

  return (
    <form className="flex max-w-2xl flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <p className="text-sm text-muted-foreground">{copy.description}</p>
      <TramiteDrawerField id={`${baseId}-name`} name="name" label={copy.fields.name} value={values.name} error={errors.name} required onChange={(name) => patch({ name })} />
      <TramiteDrawerField id={`${baseId}-taxid`} name="taxId" label={copy.fields.taxId} value={values.taxId} error={errors.taxId} required onChange={(taxId) => patch({ taxId })} />
      <TramiteDrawerField id={`${baseId}-address`} name="address" label={copy.fields.address} value={values.address} error={errors.address} required onChange={(address) => patch({ address })} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TramiteDrawerField id={`${baseId}-postal`} name="postalCode" label={copy.fields.postalCode} value={values.postalCode} error={errors.postalCode} required onChange={(postalCode) => patch({ postalCode })} />
        <TramiteDrawerField id={`${baseId}-city`} name="city" label={copy.fields.city} value={values.city} error={errors.city} required onChange={(city) => patch({ city })} />
        <TramiteDrawerField id={`${baseId}-province`} name="province" label={copy.fields.province} value={values.province} onChange={(province) => patch({ province })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TramiteDrawerField id={`${baseId}-email`} name="email" type="email" label={copy.fields.email} value={values.email} error={errors.email} onChange={(email) => patch({ email })} />
        <TramiteDrawerField id={`${baseId}-phone`} name="phone" label={copy.fields.phone} value={values.phone} onChange={(phone) => patch({ phone })} />
      </div>
      <p className="text-xs text-muted-foreground">{copy.futureNote}</p>
      <div className="flex justify-end border-t border-border pt-4 dark:border-border/60">
        <Button type="submit">{copy.save}</Button>
      </div>
    </form>
  )
}
