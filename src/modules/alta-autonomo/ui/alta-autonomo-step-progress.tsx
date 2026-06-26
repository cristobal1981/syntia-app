import { cn } from '@/lib/utils'
import {
  ALTA_AUTONOMO_STEPS,
  type AltaAutonomoStepId,
} from '@/src/modules/alta-autonomo/domain/alta-autonomo-steps'

type AltaAutonomoStepProgressProps = {
  currentStepId: AltaAutonomoStepId
  className?: string
}

export function AltaAutonomoStepProgress({
  currentStepId,
  className,
}: AltaAutonomoStepProgressProps) {
  const currentIndex = ALTA_AUTONOMO_STEPS.findIndex(
    (step) => step.id === currentStepId
  )

  return (
    <nav aria-label="Pasos del formulario" className={className}>
      <ol className="flex flex-wrap gap-2">
        {ALTA_AUTONOMO_STEPS.map((step, index) => {
          const isComplete = index < currentIndex
          const isCurrent = step.id === currentStepId

          return (
            <li key={step.id} className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  isCurrent &&
                    'bg-primary text-primary-foreground',
                  isComplete &&
                    !isCurrent &&
                    'bg-primary/15 text-primary',
                  !isCurrent &&
                    !isComplete &&
                    'bg-muted text-muted-foreground'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'text-sm',
                  isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
              {index < ALTA_AUTONOMO_STEPS.length - 1 ? (
                <span className="mx-1 hidden text-muted-foreground sm:inline" aria-hidden>
                  /
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
