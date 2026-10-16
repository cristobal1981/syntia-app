'use client'

import { useId } from 'react'
import { Info } from 'lucide-react'

import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import {
  TramiteDrawerField,
  TramiteDrawerSelect,
} from '@/src/modules/tramites/ui/tramite-drawer-field'

export type BajaAutonomoFormValues = {
  desiredDate: string
  reason: string
  observations: string
}

export const EMPTY_BAJA_AUTONOMO_FORM: BajaAutonomoFormValues = {
  desiredDate: '',
  reason: '',
  observations: '',
}

export type BajaServicioFormValues = {
  service: string
  desiredDate: string
  observations: string
}

export const EMPTY_BAJA_SERVICIO_FORM: BajaServicioFormValues = {
  service: '',
  desiredDate: '',
  observations: '',
}

type FormProps<T> = {
  values: T
  fieldErrors: Record<string, string>
  disabled?: boolean
  onChange: (values: T) => void
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="-mt-2 text-sm text-muted-foreground">{children}</p>
}

export function TramiteBajaAutonomoForm({
  values,
  fieldErrors,
  disabled,
  onChange,
}: FormProps<BajaAutonomoFormValues>) {
  const baseId = useId()
  const common = tramiteSolicitudes.common
  const copy = tramiteSolicitudes.bajaAutonomo
  const patch = (partial: Partial<BajaAutonomoFormValues>) => onChange({ ...values, ...partial })

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="flex gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium text-foreground">{copy.notice.title}</p>
          <p className="mt-1 text-muted-foreground">{copy.notice.body}</p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-sm font-semibold text-foreground">{copy.sections.request}</legend>
        <TramiteDrawerField
          id={`${baseId}-desiredDate`}
          name="desiredDate"
          type="date"
          label={copy.fields.desiredDate.label}
          value={values.desiredDate}
          error={fieldErrors.desiredDate}
          disabled={disabled}
          required
          onChange={(desiredDate) => patch({ desiredDate })}
        />
        <Hint>{copy.fields.desiredDate.hint}</Hint>
        <TramiteDrawerSelect
          id={`${baseId}-reason`}
          name="reason"
          label={copy.fields.reason.label}
          placeholder={copy.fields.reason.placeholder}
          value={values.reason}
          error={fieldErrors.reason}
          disabled={disabled}
          required
          options={copy.fields.reason.options}
          onChange={(reason) => patch({ reason })}
        />
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

export function TramiteBajaServicioForm({
  values,
  fieldErrors,
  disabled,
  onChange,
}: FormProps<BajaServicioFormValues>) {
  const baseId = useId()
  const common = tramiteSolicitudes.common
  const copy = tramiteSolicitudes.bajaServicio
  const patch = (partial: Partial<BajaServicioFormValues>) => onChange({ ...values, ...partial })

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-sm font-semibold text-foreground">{copy.sections.request}</legend>
        <TramiteDrawerSelect
          id={`${baseId}-service`}
          name="service"
          label={copy.fields.service.label}
          placeholder={copy.fields.service.placeholder}
          value={values.service}
          error={fieldErrors.service}
          disabled={disabled}
          required
          options={copy.fields.service.options}
          onChange={(service) => patch({ service })}
        />
        <TramiteDrawerField
          id={`${baseId}-desiredDate`}
          name="desiredDate"
          type="date"
          label={copy.fields.desiredDate.label}
          value={values.desiredDate}
          error={fieldErrors.desiredDate}
          disabled={disabled}
          required
          onChange={(desiredDate) => patch({ desiredDate })}
        />
        <Hint>{copy.fields.desiredDate.hint}</Hint>
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
