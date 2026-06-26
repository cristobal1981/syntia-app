'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { altaAutonomo } from '@/content/alta-autonomo'
import {
  ALTA_AUTONOMO_STEPS,
  getAltaAutonomoNextStep,
  getAltaAutonomoPreviousStep,
  getAltaAutonomoStepIndex,
  type AltaAutonomoStepId,
} from '@/src/modules/alta-autonomo/domain/alta-autonomo-steps'
import { AltaAutonomoStepProgress } from '@/src/modules/alta-autonomo/ui/alta-autonomo-step-progress'

type AltaAutonomoWizardShellProps = {
  stepId: AltaAutonomoStepId
  title: string
  description: string
  children: ReactNode
  onNext?: () => void
  nextHref?: string
  nextDisabled?: boolean
  nextLabel?: string
  showSubmit?: boolean
  submitPending?: boolean
  onSubmit?: () => void
}

export function AltaAutonomoWizardShell({
  stepId,
  title,
  description,
  children,
  onNext,
  nextHref,
  nextDisabled = false,
  nextLabel,
  showSubmit = false,
  submitPending = false,
  onSubmit,
}: AltaAutonomoWizardShellProps) {
  const copy = altaAutonomo
  const previousStep = getAltaAutonomoPreviousStep(stepId)
  const nextStep = getAltaAutonomoNextStep(stepId)
  const stepIndex = getAltaAutonomoStepIndex(stepId)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {copy.progress.stepLabel
            .replace('{current}', String(stepIndex + 1))
            .replace('{total}', String(ALTA_AUTONOMO_STEPS.length))}
        </p>
        <AltaAutonomoStepProgress currentStepId={stepId} />
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </header>

      <div className="portal-home-card rounded-xl p-6 md:p-8">{children}</div>

      <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {previousStep ? (
            <Button type="button" variant="outline" asChild>
              <Link href={previousStep.path}>{copy.nav.back}</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" asChild>
              <Link href="/alta-autonomo">{copy.nav.back}</Link>
            </Button>
          )}
          <Button type="button" variant="ghost" asChild>
            <Link href="/dashboard">{copy.nav.saveAndExit}</Link>
          </Button>
        </div>

        {showSubmit ? (
          <Button
            type="button"
            disabled={submitPending}
            onClick={onSubmit}
            className="cursor-pointer"
          >
            {submitPending ? copy.nav.submitPending : copy.nav.submit}
          </Button>
        ) : nextStep ? (
          nextHref ? (
            <Button
              type="button"
              asChild
              disabled={nextDisabled}
              className="cursor-pointer"
            >
              <Link href={nextHref}>{nextLabel ?? copy.nav.next}</Link>
            </Button>
          ) : (
            <Button
              type="button"
              disabled={nextDisabled}
              onClick={onNext}
              className="cursor-pointer"
            >
              {nextLabel ?? copy.nav.next}
            </Button>
          )
        ) : null}
      </footer>
    </div>
  )
}
