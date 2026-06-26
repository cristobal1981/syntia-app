'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { altaAutonomo } from '@/content/alta-autonomo'
import { getAltaAutonomoStepPath } from '@/src/modules/alta-autonomo/domain/alta-autonomo-steps'

export function AltaAutonomoIntroPage() {
  const copy = altaAutonomo.intro

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">{copy.durationHint}</p>
      </header>

      <section className="portal-home-card rounded-xl p-6 md:p-8">
        <h2 className="font-sans text-lg font-semibold text-foreground">
          {copy.whatYouNeedTitle}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {copy.whatYouNeedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div>
        <Button asChild className="cursor-pointer">
          <Link href={getAltaAutonomoStepPath('situacion')}>{copy.startButton}</Link>
        </Button>
      </div>
    </div>
  )
}
