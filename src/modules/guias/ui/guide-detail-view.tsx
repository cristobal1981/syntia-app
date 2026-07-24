import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { guias, type GuideEntry } from '@/content/guias'
import { getFiscalModelGuideByCode } from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import { getWindowById } from '@/src/modules/guias/domain/tax-calendar'

const copy = guias.detail

type GuideDetailViewProps = {
  guide: GuideEntry
}

export function GuideDetailView({ guide }: GuideDetailViewProps) {
  const relatedModels = (guide.relatedModelCodes ?? [])
    .map((code) => getFiscalModelGuideByCode(code))
    .filter((entry) => entry !== undefined)
  const calendarWindows = (guide.calendarWindowIds ?? [])
    .map((id) => getWindowById(id))
    .filter((window) => window !== undefined)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Button type="button" variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/guias">
            <ArrowLeft className="size-4" aria-hidden />
            <span className="ml-2">{copy.backToHub}</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {guide.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {guide.description}
          </p>
        </div>
      </header>

      <div className="flex max-w-3xl flex-col gap-6">
        {(guide.sections ?? []).map((section, index) => (
          <section key={section.heading ?? index}>
            {section.heading ? (
              <h2 className="font-sans text-lg font-semibold text-foreground">
                {section.heading}
              </h2>
            ) : null}
            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-2 text-sm leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {calendarWindows.length ? (
        <section aria-labelledby="guide-deadlines-title" className="max-w-3xl">
          <h2
            id="guide-deadlines-title"
            className="font-sans text-lg font-semibold text-foreground"
          >
            {copy.deadlinesTitle}
          </h2>
          <ul className="mt-3 space-y-2">
            {calendarWindows.map((window) => (
              <li
                key={window.id}
                className="portal-home-card flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl px-5 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {window.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {window.rangeLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedModels.length ? (
        <section aria-labelledby="guide-models-title" className="max-w-3xl">
          <h2
            id="guide-models-title"
            className="font-sans text-lg font-semibold text-foreground"
          >
            {copy.relatedModelsTitle}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {relatedModels.map((model) => (
              <li key={model.code}>
                <Link
                  href={`/guias/modelos-aeat?modelo=${model.code}`}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.06] px-3 py-1 text-xs font-semibold text-foreground hover:border-primary/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-border dark:bg-input/40"
                >
                  <span className="tabular-nums">{model.code}</span>
                  <span className="font-normal text-muted-foreground">
                    {model.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
