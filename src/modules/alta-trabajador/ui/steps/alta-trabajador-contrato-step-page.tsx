'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import {
  showsContractEndDate,
  showsPartialWeeklyHours,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import { AltaTrabajadorConditionalBlock } from '@/src/modules/alta-trabajador/ui/alta-trabajador-conditional-block'
import {
  AltaTrabajadorWizardShell,
  mapAltaTrabajadorStepErrors,
} from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-shell'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { useAltaTrabajadorStepSession } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'
import {
  TramiteDrawerField,
  TramiteDrawerSelect,
} from '@/src/modules/tramites/ui/tramite-drawer-field'

const FORM_ID = 'alta-trabajador-contrato'

export function AltaTrabajadorContratoStepPage() {
  useAltaTrabajadorStepSession('contrato')
  const router = useRouter()
  const baseId = useId()
  const { values, setField, setValues } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const wizardFields = altaTrabajadorWizard.fields
  const stepCopy = altaTrabajadorWizard.steps.contrato

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('contrato', values)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/observaciones')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="contrato"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerField
          id={`${baseId}-startDate`}
          name="startDate"
          type="date"
          label={altaCopy.startDate.label}
          value={values.startDate}
          error={fieldErrors.startDate}
          onChange={(startDate) => setField('startDate', startDate)}
        />
        <TramiteDrawerSelect
          id={`${baseId}-contractType`}
          name="contractType"
          label={altaCopy.contractType.label}
          placeholder={altaCopy.contractType.placeholder}
          value={values.contractType}
          error={fieldErrors.contractType}
          options={altaCopy.contractType.options}
          onChange={(contractType) => {
            const patch: Partial<typeof values> = { contractType }
            if (!showsContractEndDate({ ...values, contractType })) {
              patch.contractEndDate = ''
            }
            setValues(patch)
          }}
        />
        <AltaTrabajadorConditionalBlock
          show={showsContractEndDate(values)}
        >
          <TramiteDrawerField
            id={`${baseId}-contractEndDate`}
            name="contractEndDate"
            type="date"
            label={wizardFields.contractEndDate.label}
            value={values.contractEndDate}
            error={fieldErrors.contractEndDate}
            onChange={(contractEndDate) =>
              setField('contractEndDate', contractEndDate)
            }
          />
          {wizardFields.contractEndDate.hint ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {wizardFields.contractEndDate.hint}
            </p>
          ) : null}
        </AltaTrabajadorConditionalBlock>
        <TramiteDrawerSelect
          id={`${baseId}-workSchedule`}
          name="workSchedule"
          label={altaCopy.workSchedule.label}
          placeholder={altaCopy.workSchedule.placeholder}
          value={values.workSchedule}
          error={fieldErrors.workSchedule}
          options={altaCopy.workSchedule.options}
          onChange={(workSchedule) => {
            const patch: Partial<typeof values> = { workSchedule }
            if (workSchedule !== 'parcial') {
              patch.partialWeeklyHours = ''
            }
            setValues(patch)
          }}
        />
        <AltaTrabajadorConditionalBlock show={showsPartialWeeklyHours(values)}>
          <TramiteDrawerField
            id={`${baseId}-partialWeeklyHours`}
            name="partialWeeklyHours"
            label={wizardFields.partialWeeklyHours.label}
            placeholder={wizardFields.partialWeeklyHours.placeholder}
            value={values.partialWeeklyHours}
            error={fieldErrors.partialWeeklyHours}
            onChange={(partialWeeklyHours) =>
              setField('partialWeeklyHours', partialWeeklyHours)
            }
          />
          {wizardFields.partialWeeklyHours.hint ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {wizardFields.partialWeeklyHours.hint}
            </p>
          ) : null}
        </AltaTrabajadorConditionalBlock>
        <TramiteDrawerField
          id={`${baseId}-position`}
          name="position"
          label={altaCopy.position.label}
          placeholder={altaCopy.position.placeholder}
          value={values.position}
          error={fieldErrors.position}
          onChange={(position) => setField('position', position)}
        />
        <TramiteDrawerField
          id={`${baseId}-grossSalary`}
          name="grossSalary"
          label={altaCopy.grossSalary.label}
          placeholder={altaCopy.grossSalary.placeholder}
          value={values.grossSalary}
          error={fieldErrors.grossSalary}
          onChange={(grossSalary) => setField('grossSalary', grossSalary)}
        />
      </form>
    </AltaTrabajadorWizardShell>
  )
}
