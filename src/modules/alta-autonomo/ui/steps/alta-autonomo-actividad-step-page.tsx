'use client'

import { altaAutonomo } from '@/content/alta-autonomo'
import { showsEuVatNumber } from '@/src/modules/alta-autonomo/domain/alta-autonomo-visibility'
import { getAltaAutonomoStepPath } from '@/src/modules/alta-autonomo/domain/alta-autonomo-steps'
import { AltaAutonomoConditionalBlock } from '@/src/modules/alta-autonomo/ui/alta-autonomo-conditional-block'
import { useAltaAutonomoWizard } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-context'
import {
  AltaAutonomoWizardField,
  AltaAutonomoWizardTextarea,
} from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-field'
import { AltaAutonomoWizardShell } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-shell'
import { AltaAutonomoWizardYesNo } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-yes-no'

export function AltaAutonomoActividadStepPage() {
  const copy = altaAutonomo
  const { values, setField } = useAltaAutonomoWizard()
  const fields = copy.fields

  return (
    <AltaAutonomoWizardShell
      stepId="actividad"
      title={copy.steps.actividad.title}
      description={copy.steps.actividad.description}
      nextHref={getAltaAutonomoStepPath('resumen')}
    >
      <div className="flex flex-col gap-6">
        <AltaAutonomoWizardTextarea
          id="alta-autonomo-activity"
          name="activityDescription"
          label={fields.activityDescription.label}
          placeholder={fields.activityDescription.placeholder}
          value={values.activityDescription}
          onChange={(value) => setField('activityDescription', value)}
        />
        <AltaAutonomoWizardField
          id="alta-autonomo-start-date"
          name="startDate"
          type="date"
          label={fields.startDate.label}
          hint={fields.startDate.hint}
          value={values.startDate}
          onChange={(value) => setField('startDate', value)}
        />
        <AltaAutonomoWizardYesNo
          id="alta-autonomo-invoices-eu"
          name="invoicesEu"
          label={fields.invoicesEu.label}
          value={values.invoicesEu}
          options={fields.invoicesEu.options}
          onChange={(value) => {
            setField('invoicesEu', value)
            if (value !== 'yes') {
              setField('euVatNumber', '')
            }
          }}
        />
        <AltaAutonomoConditionalBlock visible={showsEuVatNumber(values)}>
          <AltaAutonomoWizardField
            id="alta-autonomo-eu-vat"
            name="euVatNumber"
            label={fields.euVatNumber.label}
            placeholder={fields.euVatNumber.placeholder}
            value={values.euVatNumber}
            onChange={(value) => setField('euVatNumber', value)}
          />
        </AltaAutonomoConditionalBlock>
        <AltaAutonomoWizardTextarea
          id="alta-autonomo-observations"
          name="observations"
          label={fields.observations.label}
          placeholder={fields.observations.placeholder}
          value={values.observations}
          onChange={(value) => setField('observations', value)}
        />
      </div>
    </AltaAutonomoWizardShell>
  )
}
