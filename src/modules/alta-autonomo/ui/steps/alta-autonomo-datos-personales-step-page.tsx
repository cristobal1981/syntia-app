'use client'

import { altaAutonomo } from '@/content/alta-autonomo'
import { getAltaAutonomoStepPath } from '@/src/modules/alta-autonomo/domain/alta-autonomo-steps'
import { useAltaAutonomoWizard } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-context'
import { AltaAutonomoWizardField } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-field'
import { AltaAutonomoWizardShell } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-shell'

export function AltaAutonomoDatosPersonalesStepPage() {
  const copy = altaAutonomo
  const { values, setField } = useAltaAutonomoWizard()
  const fields = copy.fields

  return (
    <AltaAutonomoWizardShell
      stepId="datos-personales"
      title={copy.steps.datosPersonales.title}
      description={copy.steps.datosPersonales.description}
      nextHref={getAltaAutonomoStepPath('actividad')}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <AltaAutonomoWizardField
          id="alta-autonomo-full-name"
          name="fullName"
          label={fields.fullName.label}
          placeholder={fields.fullName.placeholder}
          value={values.fullName}
          autoComplete="name"
          className="sm:col-span-2"
          onChange={(value) => setField('fullName', value)}
        />
        <AltaAutonomoWizardField
          id="alta-autonomo-tax-id"
          name="taxId"
          label={fields.taxId.label}
          placeholder={fields.taxId.placeholder}
          value={values.taxId}
          autoComplete="off"
          onChange={(value) => setField('taxId', value)}
        />
        <AltaAutonomoWizardField
          id="alta-autonomo-phone"
          name="phone"
          label={fields.phone.label}
          placeholder={fields.phone.placeholder}
          value={values.phone}
          type="tel"
          autoComplete="tel"
          onChange={(value) => setField('phone', value)}
        />
        <AltaAutonomoWizardField
          id="alta-autonomo-email"
          name="email"
          label={fields.email.label}
          placeholder={fields.email.placeholder}
          value={values.email}
          type="email"
          autoComplete="email"
          className="sm:col-span-2"
          onChange={(value) => setField('email', value)}
        />
      </div>
    </AltaAutonomoWizardShell>
  )
}
