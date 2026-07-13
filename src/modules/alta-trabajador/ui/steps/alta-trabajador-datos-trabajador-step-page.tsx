'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import {
  AltaTrabajadorWizardShell,
  mapAltaTrabajadorStepErrors,
} from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-shell'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { useAltaTrabajadorStepSession } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'
import {
  TramiteDrawerField,
} from '@/src/modules/tramites/ui/tramite-drawer-field'

const FORM_ID = 'alta-trabajador-datos-trabajador'

export function AltaTrabajadorDatosTrabajadorStepPage() {
  useAltaTrabajadorStepSession('datos-trabajador')
  const router = useRouter()
  const baseId = useId()
  const { values, setField } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const common = tramiteSolicitudes.common
  const stepCopy = altaTrabajadorWizard.steps.datosTrabajador

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('datos-trabajador', values)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/contrato')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="datos-trabajador"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerField
          id={`${baseId}-fullName`}
          name="fullName"
          label={common.fields.fullName.label}
          placeholder={common.fields.fullName.placeholder}
          value={values.fullName}
          error={fieldErrors.fullName}
          autoComplete="name"
          onChange={(fullName) => setField('fullName', fullName)}
        />
        <TramiteDrawerField
          id={`${baseId}-dni`}
          name="dni"
          label={common.fields.dni.label}
          placeholder={common.fields.dni.placeholder}
          value={values.dni}
          error={fieldErrors.dni}
          onChange={(dni) => setField('dni', dni)}
        />
      </form>
    </AltaTrabajadorWizardShell>
  )
}
