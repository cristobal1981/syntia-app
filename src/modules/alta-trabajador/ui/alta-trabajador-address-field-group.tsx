'use client'

import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { TramiteDrawerField } from '@/src/modules/tramites/ui/tramite-drawer-field'

export type AltaTrabajadorAddressValue = {
  street: string
  number: string
  city: string
  province: string
  postalCode: string
}

type AltaTrabajadorAddressFieldGroupProps = {
  idPrefix: string
  namePrefix: string
  value: AltaTrabajadorAddressValue
  errors?: Partial<Record<keyof AltaTrabajadorAddressValue, string>>
  required?: boolean
  onChange: (field: keyof AltaTrabajadorAddressValue, value: string) => void
}

export function AltaTrabajadorAddressFieldGroup({
  idPrefix,
  namePrefix,
  value,
  errors,
  required,
  onChange,
}: AltaTrabajadorAddressFieldGroupProps) {
  const copy = tramiteSolicitudes.common.address

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TramiteDrawerField
        id={`${idPrefix}-street`}
        name={`${namePrefix}Street`}
        label={copy.street.label}
        placeholder={copy.street.placeholder}
        value={value.street}
        error={errors?.street}
        required={required}
        className="sm:col-span-2"
        onChange={(next) => onChange('street', next)}
      />
      <TramiteDrawerField
        id={`${idPrefix}-number`}
        name={`${namePrefix}Number`}
        label={copy.number.label}
        placeholder={copy.number.placeholder}
        value={value.number}
        error={errors?.number}
        required={required}
        onChange={(next) => onChange('number', next)}
      />
      <TramiteDrawerField
        id={`${idPrefix}-postalCode`}
        name={`${namePrefix}PostalCode`}
        label={copy.postalCode.label}
        placeholder={copy.postalCode.placeholder}
        value={value.postalCode}
        error={errors?.postalCode}
        required={required}
        onChange={(next) => onChange('postalCode', next)}
      />
      <TramiteDrawerField
        id={`${idPrefix}-city`}
        name={`${namePrefix}City`}
        label={copy.city.label}
        placeholder={copy.city.placeholder}
        value={value.city}
        error={errors?.city}
        required={required}
        onChange={(next) => onChange('city', next)}
      />
      <TramiteDrawerField
        id={`${idPrefix}-province`}
        name={`${namePrefix}Province`}
        label={copy.province.label}
        placeholder={copy.province.placeholder}
        value={value.province}
        error={errors?.province}
        required={required}
        onChange={(next) => onChange('province', next)}
      />
    </div>
  )
}
