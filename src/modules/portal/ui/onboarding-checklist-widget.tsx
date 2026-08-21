'use client'

import { CheckCircle2, Circle, Lightbulb, ListChecks, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import type {
  ChecklistStep,
  ChecklistStepId,
} from '@/src/modules/portal/domain/onboarding-checklist-steps'

const copy = portal.onboardingChecklist

function formatProgress(current: number, total: number): string {
  return copy.progressLabel
    .replace('{completed}', String(current))
    .replace('{total}', String(total))
}

type OnboardingChecklistWidgetProps = {
  steps: ChecklistStep[]
  completed: Set<ChecklistStepId>
  expanded: boolean
  activeTip: ChecklistStep | null
  onExpand: () => void
  onCollapse: () => void
  onDismiss: () => void
  onShowTip: (id: ChecklistStepId) => void
}

export function OnboardingChecklistWidget({
  steps,
  completed,
  expanded,
  activeTip,
  onExpand,
  onCollapse,
  onDismiss,
  onShowTip,
}: OnboardingChecklistWidgetProps) {
  // Count against the current step list, not raw `completed.size`: a step id
  // marked complete in an earlier release (or a stale localStorage value) can
  // outlive that step's removal from `steps`, which would otherwise inflate
  // the count past the total and permanently hide the "all done" CTA.
  const completedCount = steps.filter((step) => completed.has(step.id)).length
  const allDone = completedCount === steps.length

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        // Below the mobile menu's z-40 (portal-shell.tsx): with equal z-index
        // this widget — mounted last in the DOM — would paint over the menu
        // and swallow taps on its lower items while it's open.
        className="fixed right-4 bottom-4 z-30 flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card py-2 pr-4 pl-3 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-accent"
      >
        <ListChecks className="size-4 text-primary" aria-hidden />
        {formatProgress(completedCount, steps.length)}
      </button>
    )
  }

  return (
    <div
      role="region"
      aria-label={copy.title}
      className="fixed right-4 bottom-4 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-sans text-sm font-semibold text-foreground">
            {copy.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatProgress(completedCount, steps.length)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label={copy.dismiss}
          className="cursor-pointer rounded-sm p-1 text-subtle-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {activeTip ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{activeTip.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {activeTip.description}
            </p>
          </div>
        </div>
      ) : null}

      <ul className="mt-3 flex flex-col gap-1">
        {steps.map((step) => {
          const done = completed.has(step.id)
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onShowTip(step.id)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent"
              >
                {done ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    done ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {allDone ? (
        <Button
          type="button"
          size="sm"
          className="mt-4 w-full cursor-pointer"
          onClick={onDismiss}
        >
          {copy.dismiss}
        </Button>
      ) : null}
    </div>
  )
}
