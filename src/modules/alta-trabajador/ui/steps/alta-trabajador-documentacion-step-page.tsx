'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { showsIdentityDocument } from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import { AltaTrabajadorAttachmentField } from '@/src/modules/alta-trabajador/ui/alta-trabajador-attachment-field'
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

const FORM_ID = 'alta-trabajador-documentacion'

export function AltaTrabajadorDocumentacionStepPage() {
  useAltaTrabajadorStepSession('documentacion')
  const router = useRouter()
  const baseId = useId()
  const { values, attachment, setField, setValues, setAttachment } =
    useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const common = tramiteSolicitudes.common
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const stepCopy = altaTrabajadorWizard.steps.documentacion

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('documentacion', values, attachment)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/resumen')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="documentacion"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerSelect
          id={`${baseId}-requiresWorkAuthorization`}
          name="requiresWorkAuthorization"
          label={altaCopy.requiresWorkAuthorization.label}
          placeholder={altaCopy.requiresWorkAuthorization.placeholder}
          value={values.requiresWorkAuthorization}
          error={fieldErrors.requiresWorkAuthorization}
          required
          options={altaCopy.requiresWorkAuthorization.options}
          onChange={(requiresWorkAuthorization) => {
            setValues({ requiresWorkAuthorization })
            if (requiresWorkAuthorization !== 'si') setAttachment(null)
          }}
        />
        <AltaTrabajadorConditionalBlock show={showsIdentityDocument(values)}>
          <AltaTrabajadorAttachmentField
            label={altaCopy.identityDocument.label}
            hint={altaCopy.identityDocument.hint}
            value={attachment}
            error={fieldErrors.identityDocument}
            required
            onChange={setAttachment}
          />
        </AltaTrabajadorConditionalBlock>
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
