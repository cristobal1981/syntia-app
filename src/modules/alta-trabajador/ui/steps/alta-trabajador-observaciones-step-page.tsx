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
import { TramiteDrawerField } from '@/src/modules/tramites/ui/tramite-drawer-field'

const FORM_ID = 'alta-trabajador-observaciones'

export function AltaTrabajadorObservacionesStepPage() {
  useAltaTrabajadorStepSession('observaciones')
  const router = useRouter()
  const baseId = useId()
  const { values, setField } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const common = tramiteSolicitudes.common
  const stepCopy = altaTrabajadorWizard.steps.observaciones

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('observaciones', values)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/resumen')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="observaciones"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerField
          id={`${baseId}-observations`}
          name="observations"
          label={common.fields.observations.label}
          placeholder={common.fields.observations.placeholder}
          value={values.observations}
          error={fieldErrors.observations}
          onChange={(observations) => setField('observations', observations)}
        />
      </form>
    </AltaTrabajadorWizardShell>
  )
}
