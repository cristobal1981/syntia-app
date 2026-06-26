'use client'

import { useId } from 'react'

import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import {
  TramiteDrawerField,
  TramiteDrawerSelect,
} from '@/src/modules/tramites/ui/tramite-drawer-field'

export type TrabajadorFormValues = {
  fullName: string
  taxId: string
  startDate: string
  contractType: string
  workSchedule: string
  position: string
  grossSalary: string
  endDate: string
  reason: string
  observations: string
}

export const EMPTY_TRABAJADOR_FORM: TrabajadorFormValues = {
  fullName: '',
  taxId: '',
  startDate: '',
  contractType: '',
  workSchedule: '',
  position: '',
  grossSalary: '',
  endDate: '',
  reason: '',
  observations: '',
}

type TramiteTrabajadorFormProps = {
  mode: 'alta' | 'baja'
  values: TrabajadorFormValues
  fieldErrors: Record<string, string>
  disabled?: boolean
  onChange: (values: TrabajadorFormValues) => void
}

export function TramiteTrabajadorForm({
  mode,
  values,
  fieldErrors,
  disabled,
  onChange,
}: TramiteTrabajadorFormProps) {
  const baseId = useId()
  const common = tramiteSolicitudes.common
  const isAlta = mode === 'alta'
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const bajaCopy = tramiteSolicitudes.bajaTrabajador.fields

  const patch = (partial: Partial<TrabajadorFormValues>) => {
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
          id={`${baseId}-taxId`}
          name="taxId"
          label={common.fields.taxId.label}
          placeholder={common.fields.taxId.placeholder}
          value={values.taxId}
          error={fieldErrors.taxId}
          disabled={disabled}
          onChange={(taxId) => patch({ taxId })}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-sm font-semibold text-foreground">
          {common.sections.details}
        </legend>
        {isAlta ? (
          <>
            <TramiteDrawerField
              id={`${baseId}-startDate`}
              name="startDate"
              type="date"
              label={altaCopy.startDate.label}
              value={values.startDate}
              error={fieldErrors.startDate}
              disabled={disabled}
              onChange={(startDate) => patch({ startDate })}
            />
            <TramiteDrawerSelect
              id={`${baseId}-contractType`}
              name="contractType"
              label={altaCopy.contractType.label}
              placeholder={altaCopy.contractType.placeholder}
              value={values.contractType}
              error={fieldErrors.contractType}
              disabled={disabled}
              options={altaCopy.contractType.options}
              onChange={(contractType) => patch({ contractType })}
            />
            <TramiteDrawerSelect
              id={`${baseId}-workSchedule`}
              name="workSchedule"
              label={altaCopy.workSchedule.label}
              placeholder={altaCopy.workSchedule.placeholder}
              value={values.workSchedule}
              error={fieldErrors.workSchedule}
              disabled={disabled}
              options={altaCopy.workSchedule.options}
              onChange={(workSchedule) => patch({ workSchedule })}
            />
            <TramiteDrawerField
              id={`${baseId}-position`}
              name="position"
              label={altaCopy.position.label}
              placeholder={altaCopy.position.placeholder}
              value={values.position}
              error={fieldErrors.position}
              disabled={disabled}
              onChange={(position) => patch({ position })}
            />
            <TramiteDrawerField
              id={`${baseId}-grossSalary`}
              name="grossSalary"
              label={altaCopy.grossSalary.label}
              placeholder={altaCopy.grossSalary.placeholder}
              value={values.grossSalary}
              error={fieldErrors.grossSalary}
              disabled={disabled}
              onChange={(grossSalary) => patch({ grossSalary })}
            />
          </>
        ) : (
          <>
            <TramiteDrawerField
              id={`${baseId}-endDate`}
              name="endDate"
              type="date"
              label={bajaCopy.endDate.label}
              value={values.endDate}
              error={fieldErrors.endDate}
              disabled={disabled}
              onChange={(endDate) => patch({ endDate })}
            />
            <TramiteDrawerSelect
              id={`${baseId}-reason`}
              name="reason"
              label={bajaCopy.reason.label}
              placeholder={bajaCopy.reason.placeholder}
              value={values.reason}
              error={fieldErrors.reason}
              disabled={disabled}
              options={bajaCopy.reason.options}
              onChange={(reason) => patch({ reason })}
            />
          </>
        )}
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
