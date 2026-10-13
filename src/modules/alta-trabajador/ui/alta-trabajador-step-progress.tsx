'use client'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import {
  ALTA_TRABAJADOR_STEPS,
  getAltaTrabajadorStepIndex,
  type AltaTrabajadorStepId,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import { ProcedureWizardStepProgress } from '@/src/modules/tramites/ui/procedure-wizard-step-progress'

type AltaTrabajadorStepProgressProps = {
  currentStepId: AltaTrabajadorStepId
}

export function AltaTrabajadorStepProgress({
  currentStepId,
}: AltaTrabajadorStepProgressProps) {
  const currentIndex = getAltaTrabajadorStepIndex(currentStepId)
  const total = ALTA_TRABAJADOR_STEPS.length

  return (
    <ProcedureWizardStepProgress
      currentIndex={currentIndex}
      total={total}
      label={altaTrabajadorWizard.progress.label}
      stepLabel={altaTrabajadorWizard.progress.stepLabel
        .replace('{current}', String(currentIndex + 1))
        .replace('{total}', String(total))}
    />
  )
}
