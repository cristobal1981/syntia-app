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

const FORM_ID = 'alta-trabajador-datos-personales'

export function AltaTrabajadorDatosPersonalesStepPage() {
  useAltaTrabajadorStepSession('datos-personales')
  const router = useRouter()
  const baseId = useId()
  const { values, attachment, setField } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const common = tramiteSolicitudes.common
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const stepCopy = altaTrabajadorWizard.steps.datosPersonales

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('datos-personales', values, attachment)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/domicilio')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="datos-personales"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TramiteDrawerField
            id={`${baseId}-firstName`}
            name="firstName"
            label={common.fields.firstName.label}
            placeholder={common.fields.firstName.placeholder}
            value={values.firstName}
            error={fieldErrors.firstName}
            required
            autoComplete="given-name"
            onChange={(firstName) => setField('firstName', firstName)}
          />
          <TramiteDrawerField
            id={`${baseId}-lastName`}
            name="lastName"
            label={common.fields.lastName.label}
            placeholder={common.fields.lastName.placeholder}
            value={values.lastName}
            error={fieldErrors.lastName}
            required
            autoComplete="family-name"
            onChange={(lastName) => setField('lastName', lastName)}
          />
        </div>
        <TramiteDrawerField
          id={`${baseId}-dni`}
          name="dni"
          label={common.fields.dni.label}
          placeholder={common.fields.dni.placeholder}
          value={values.dni}
          error={fieldErrors.dni}
          required
          onChange={(dni) => setField('dni', dni)}
        />
        <TramiteDrawerField
          id={`${baseId}-naf`}
          name="naf"
          label={altaCopy.naf.label}
          placeholder={altaCopy.naf.placeholder}
          value={values.naf}
          error={fieldErrors.naf}
          onChange={(naf) => setField('naf', naf)}
        />
        <TramiteDrawerField
          id={`${baseId}-email`}
          name="email"
          type="email"
          label={altaCopy.email.label}
          placeholder={altaCopy.email.placeholder}
          value={values.email}
          error={fieldErrors.email}
          autoComplete="email"
          onChange={(email) => setField('email', email)}
        />
        <TramiteDrawerField
          id={`${baseId}-phone`}
          name="phone"
          type="tel"
          label={altaCopy.phone.label}
          placeholder={altaCopy.phone.placeholder}
          value={values.phone}
          error={fieldErrors.phone}
          autoComplete="tel"
          onChange={(phone) => setField('phone', phone)}
        />
        <TramiteDrawerField
          id={`${baseId}-iban`}
          name="iban"
          label={altaCopy.iban.label}
          placeholder={altaCopy.iban.placeholder}
          value={values.iban}
          error={fieldErrors.iban}
          onChange={(iban) => setField('iban', iban)}
        />
      </form>
    </AltaTrabajadorWizardShell>
  )
}
