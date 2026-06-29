'use client'

import { useId } from 'react'

import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { TramiteDrawerField } from '@/src/modules/tramites/ui/tramite-drawer-field'

export type CartaVacacionesFormValues = {
  fullName: string
  dni: string
  periodStart: string
  periodEnd: string
  days: string
  vacationYear: string
  observations: string
}

export const EMPTY_CARTA_VACACIONES_FORM: CartaVacacionesFormValues = {
  fullName: '',
  dni: '',
  periodStart: '',
  periodEnd: '',
  days: '',
  vacationYear: '',
  observations: '',
}

type TramiteCartaVacacionesFormProps = {
  values: CartaVacacionesFormValues
  fieldErrors: Record<string, string>
  disabled?: boolean
  onChange: (values: CartaVacacionesFormValues) => void
}

export function TramiteCartaVacacionesForm({
  values,
  fieldErrors,
  disabled,
  onChange,
}: TramiteCartaVacacionesFormProps) {
  const baseId = useId()
  const common = tramiteSolicitudes.common
  const copy = tramiteSolicitudes.cartaVacaciones.fields

  const patch = (partial: Partial<CartaVacacionesFormValues>) => {
    onChange({ ...values, ...partial })
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-sm font-semibold text-foreground">
          {common.sections.worker}
        </legend>
        <TramiteDrawerField
          id={`${baseId}-fullName`}
          name="fullName"
          label={common.fields.fullName.label}
          placeholder={common.fields.fullName.placeholder}
          value={values.fullName}
          error={fieldErrors.fullName}
          disabled={disabled}
          autoComplete="name"
          onChange={(fullName) => patch({ fullName })}
        />
        <TramiteDrawerField
          id={`${baseId}-dni`}
          name="dni"
          label={common.fields.dni.label}
          placeholder={common.fields.dni.placeholder}
          value={values.dni}
          error={fieldErrors.dni}
          disabled={disabled}
          onChange={(dni) => patch({ dni })}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-sm font-semibold text-foreground">
          {common.sections.details}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TramiteDrawerField
            id={`${baseId}-periodStart`}
            name="periodStart"
            type="date"
            label={copy.periodStart.label}
            value={values.periodStart}
            error={fieldErrors.periodStart}
            disabled={disabled}
            onChange={(periodStart) => patch({ periodStart })}
          />
          <TramiteDrawerField
            id={`${baseId}-periodEnd`}
            name="periodEnd"
            type="date"
            label={copy.periodEnd.label}
            value={values.periodEnd}
            error={fieldErrors.periodEnd}
            disabled={disabled}
            onChange={(periodEnd) => patch({ periodEnd })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TramiteDrawerField
            id={`${baseId}-days`}
            name="days"
            type="number"
            label={copy.days.label}
            placeholder={copy.days.placeholder}
            value={values.days}
            error={fieldErrors.days}
            disabled={disabled}
            onChange={(days) => patch({ days })}
          />
          <TramiteDrawerField
            id={`${baseId}-vacationYear`}
            name="vacationYear"
            type="number"
            label={copy.vacationYear.label}
            placeholder={copy.vacationYear.placeholder}
            value={values.vacationYear}
            error={fieldErrors.vacationYear}
            disabled={disabled}
            onChange={(vacationYear) => patch({ vacationYear })}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-sm font-semibold text-foreground">
          {common.sections.observations}
        </legend>
        <TramiteDrawerField
          id={`${baseId}-observations`}
          name="observations"
          label={common.fields.observations.label}
          placeholder={common.fields.observations.placeholder}
          value={values.observations}
          error={fieldErrors.observations}
          disabled={disabled}
          onChange={(observations) => patch({ observations })}
        />
      </fieldset>
    </div>
  )
}
