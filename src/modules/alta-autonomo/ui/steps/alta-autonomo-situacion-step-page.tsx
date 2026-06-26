'use client'

import { altaAutonomo } from '@/content/alta-autonomo'
import {
  showsEmployeesCount,
  showsPreviousBajaDate,
} from '@/src/modules/alta-autonomo/domain/alta-autonomo-visibility'
import { AltaAutonomoConditionalBlock } from '@/src/modules/alta-autonomo/ui/alta-autonomo-conditional-block'
import { useAltaAutonomoWizard } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-context'
import { AltaAutonomoWizardField } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-field'
import { AltaAutonomoWizardShell } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-shell'
import { AltaAutonomoWizardYesNo } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-yes-no'
import { getAltaAutonomoStepPath } from '@/src/modules/alta-autonomo/domain/alta-autonomo-steps'

export function AltaAutonomoSituacionStepPage() {
  const copy = altaAutonomo
  const { values, setField } = useAltaAutonomoWizard()
  const fields = copy.fields

  return (
    <AltaAutonomoWizardShell
      stepId="situacion"
      title={copy.steps.situacion.title}
      description={copy.steps.situacion.description}
      nextHref={getAltaAutonomoStepPath('datos-personales')}
    >
      <div className="flex flex-col gap-6">
        <AltaAutonomoWizardYesNo
          id="alta-autonomo-was-before"
          name="wasAutonomoBefore"
          label={fields.wasAutonomoBefore.label}
          value={values.wasAutonomoBefore}
          options={fields.wasAutonomoBefore.options}
          onChange={(value) => {
            setField('wasAutonomoBefore', value)
            if (value !== 'yes') {
              setField('previousBajaDate', '')
            }
          }}
        />

        <AltaAutonomoConditionalBlock visible={showsPreviousBajaDate(values)}>
          <AltaAutonomoWizardField
            id="alta-autonomo-baja-date"
            name="previousBajaDate"
            label={fields.previousBajaDate.label}
            hint={fields.previousBajaDate.hint}
            placeholder={fields.previousBajaDate.placeholder}
            value={values.previousBajaDate}
            onChange={(value) => setField('previousBajaDate', value)}
          />
        </AltaAutonomoConditionalBlock>

        <AltaAutonomoWizardYesNo
          id="alta-autonomo-employees"
          name="willHaveEmployees"
          label={fields.willHaveEmployees.label}
          value={values.willHaveEmployees}
          options={fields.willHaveEmployees.options}
          onChange={(value) => {
            setField('willHaveEmployees', value)
            if (value !== 'yes') {
              setField('employeesCount', '')
            }
          }}
        />

        <AltaAutonomoConditionalBlock visible={showsEmployeesCount(values)}>
          <AltaAutonomoWizardField
            id="alta-autonomo-employees-count"
            name="employeesCount"
            label={fields.employeesCount.label}
            placeholder={fields.employeesCount.placeholder}
            value={values.employeesCount}
            onChange={(value) => setField('employeesCount', value)}
          />
        </AltaAutonomoConditionalBlock>
      </div>
    </AltaAutonomoWizardShell>
  )
}
