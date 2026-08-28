'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { SEPE_NIVELES_ESTUDIO_OPTIONS } from '@/content/sepe-niveles-estudio'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import { AltaTrabajadorOccupationCombobox } from '@/src/modules/alta-trabajador/ui/alta-trabajador-occupation-combobox'
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

const FORM_ID = 'alta-trabajador-puesto-ocupacion'

export function AltaTrabajadorPuestoOcupacionStepPage() {
  useAltaTrabajadorStepSession('puesto-ocupacion')
  const router = useRouter()
  const baseId = useId()
  const { values, attachment, setField } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const stepCopy = altaTrabajadorWizard.steps.puestoOcupacion

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('puesto-ocupacion', values, attachment)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/contrato')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="puesto-ocupacion"
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
          required
          onChange={(startDate) => setField('startDate', startDate)}
        />
        <TramiteDrawerField
          id={`${baseId}-workCenter`}
          name="workCenter"
          label={altaCopy.workCenter.label}
          placeholder={altaCopy.workCenter.placeholder}
          value={values.workCenter}
          error={fieldErrors.workCenter}
          required
          onChange={(workCenter) => setField('workCenter', workCenter)}
        />
        <TramiteDrawerField
          id={`${baseId}-position`}
          name="position"
          label={altaCopy.position.label}
          placeholder={altaCopy.position.placeholder}
          value={values.position}
          error={fieldErrors.position}
          required
          onChange={(position) => setField('position', position)}
        />
        <TramiteDrawerField
          id={`${baseId}-jobDuties`}
          name="jobDuties"
          label={altaCopy.jobDuties.label}
          placeholder={altaCopy.jobDuties.placeholder}
          value={values.jobDuties}
          error={fieldErrors.jobDuties}
          required
          onChange={(jobDuties) => setField('jobDuties', jobDuties)}
        />
        <AltaTrabajadorOccupationCombobox
          id={`${baseId}-sepeOccupationCode`}
          label={altaCopy.sepeOccupationCode.label}
          value={values.sepeOccupationCode}
          error={fieldErrors.sepeOccupationCode}
          required
          onChange={(sepeOccupationCode) => setField('sepeOccupationCode', sepeOccupationCode)}
        />
        <TramiteDrawerSelect
          id={`${baseId}-studiesLevel`}
          name="studiesLevel"
          label={altaCopy.studiesLevel.label}
          placeholder={altaCopy.studiesLevel.placeholder}
          value={values.studiesLevel}
          error={fieldErrors.studiesLevel}
          required
          options={SEPE_NIVELES_ESTUDIO_OPTIONS}
          onChange={(studiesLevel) => setField('studiesLevel', studiesLevel)}
        />
      </form>
    </AltaTrabajadorWizardShell>
  )
}
