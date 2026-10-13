'use client'

import { cn } from '@/lib/utils'

type ProcedureWizardStepProgressProps = {
  currentIndex: number
  total: number
  label: string
  stepLabel: string
}

export function ProcedureWizardStepProgress({
  currentIndex,
  total,
  label,
  stepLabel,
}: ProcedureWizardStepProgressProps) {
  const percent = Math.round(((currentIndex + 1) / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{stepLabel}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full bg-primary transition-[width]')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
