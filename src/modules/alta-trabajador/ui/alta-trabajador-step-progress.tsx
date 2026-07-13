'use client'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { cn } from '@/lib/utils'
import {
  ALTA_TRABAJADOR_STEPS,
  getAltaTrabajadorStepIndex,
  type AltaTrabajadorStepId,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'

type AltaTrabajadorStepProgressProps = {
  currentStepId: AltaTrabajadorStepId
}

export function AltaTrabajadorStepProgress({
  currentStepId,
}: AltaTrabajadorStepProgressProps) {
  const currentIndex = getAltaTrabajadorStepIndex(currentStepId)
  const total = ALTA_TRABAJADOR_STEPS.length
  const percent = Math.round(((currentIndex + 1) / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">
          {altaTrabajadorWizard.progress.label}
        </span>
        <span className="text-muted-foreground">
          {altaTrabajadorWizard.progress.stepLabel
            .replace('{current}', String(currentIndex + 1))
            .replace('{total}', String(total))}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={altaTrabajadorWizard.progress.label}
      >
        <div
          className={cn('h-full rounded-full bg-primary transition-[width]')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
