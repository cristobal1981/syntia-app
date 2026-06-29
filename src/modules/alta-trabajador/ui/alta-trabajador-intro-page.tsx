'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { readAltaTrabajadorDraft } from '@/src/modules/alta-trabajador/domain/alta-trabajador-draft'
import {
  getAltaTrabajadorStepPath,
  type AltaTrabajadorStepId,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import { getAltaTrabajadorResumePath } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'

export function AltaTrabajadorIntroPage() {
  const router = useRouter()
  const { resumeDraft, startFresh } = useAltaTrabajadorWizard()
  const [resumeStepId, setResumeStepId] = useState<AltaTrabajadorStepId | null>(
    null
  )
  const copy = altaTrabajadorWizard.intro

  useEffect(() => {
    const draft = readAltaTrabajadorDraft()
    setResumeStepId(draft?.lastStepId ?? null)
  }, [])

  const handleStartFresh = () => {
    startFresh()
    router.push(getAltaTrabajadorStepPath('datos-trabajador'))
  }

  const handleResume = () => {
    const stepId = resumeDraft()
    router.push(getAltaTrabajadorResumePath(stepId))
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="space-y-3">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {copy.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          {copy.description}
        </p>
        <p className="text-sm text-muted-foreground">{copy.durationHint}</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-sm font-semibold text-foreground">
          {copy.whatYouNeedTitle}
        </h2>
        <ul className="mt-3 space-y-2">
          {copy.whatYouNeedItems.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {resumeStepId ? (
        <div className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/5 p-5">
          <p className="text-sm text-muted-foreground">{copy.draftHint}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="cursor-pointer gap-2"
              onClick={handleResume}
            >
              {copy.resumeButton}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={handleStartFresh}
            >
              {copy.startFreshButton}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            className="cursor-pointer gap-2"
            onClick={handleStartFresh}
          >
            {copy.startButton}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}
