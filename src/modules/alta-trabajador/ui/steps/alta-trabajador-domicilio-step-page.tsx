'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import {
  AltaTrabajadorAddressFieldGroup,
  type AltaTrabajadorAddressValue,
} from '@/src/modules/alta-trabajador/ui/alta-trabajador-address-field-group'
import {
  AltaTrabajadorWizardShell,
  mapAltaTrabajadorStepErrors,
} from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-shell'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { useAltaTrabajadorStepSession } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'
import { TramiteDrawerField } from '@/src/modules/tramites/ui/tramite-drawer-field'

const FORM_ID = 'alta-trabajador-domicilio'

export function AltaTrabajadorDomicilioStepPage() {
  useAltaTrabajadorStepSession('domicilio')
  const router = useRouter()
  const baseId = useId()
  const { values, attachment, setField } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const stepCopy = altaTrabajadorWizard.steps.domicilio

  const handleAddressChange = (field: keyof AltaTrabajadorAddressValue, value: string) => {
    if (field === 'street') setField('addressStreet', value)
    else if (field === 'number') setField('addressNumber', value)
    else if (field === 'city') setField('addressCity', value)
    else if (field === 'province') setField('addressProvince', value)
    else setField('addressPostalCode', value)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('domicilio', values, attachment)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/puesto-ocupacion')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="domicilio"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerField
          id={`${baseId}-birthDate`}
          name="birthDate"
          type="date"
          label={altaCopy.birthDate.label}
          value={values.birthDate}
          error={fieldErrors.birthDate}
          required
          onChange={(birthDate) => setField('birthDate', birthDate)}
        />
        <AltaTrabajadorAddressFieldGroup
          idPrefix={`${baseId}-address`}
          namePrefix="address"
          value={{
            street: values.addressStreet,
            number: values.addressNumber,
            city: values.addressCity,
            province: values.addressProvince,
            postalCode: values.addressPostalCode,
          }}
          errors={{
            street: fieldErrors.addressStreet,
            number: fieldErrors.addressNumber,
            city: fieldErrors.addressCity,
            province: fieldErrors.addressProvince,
            postalCode: fieldErrors.addressPostalCode,
          }}
          required
          onChange={handleAddressChange}
        />
      </form>
    </AltaTrabajadorWizardShell>
  )
}
