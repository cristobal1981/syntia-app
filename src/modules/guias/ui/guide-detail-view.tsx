import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { guias, type GuideEntry } from '@/content/guias'
import { cn } from '@/lib/utils'
import { getFiscalModelGuideByCode } from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import { GUIDE_CATEGORY_ICON } from '@/src/modules/guias/ui/guide-category-icon'
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
  const hasSidebar = calendarWindows.length > 0 || relatedModels.length > 0
  const CategoryIcon = GUIDE_CATEGORY_ICON[guide.category]

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
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-accent-on-light uppercase dark:text-primary">
            <CategoryIcon className="size-3.5" aria-hidden />
            {guias.categories[guide.category]}
          </p>
          <h1 className="mt-1 font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {guide.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {guide.description}
          </p>
        </div>
      </header>

      <div
        className={cn(
          'flex flex-col gap-8',
          hasSidebar && 'lg:flex-row lg:items-start lg:gap-10'
        )}
      >
        <div className="flex max-w-3xl flex-col gap-6">
          {(guide.sections ?? []).map((section, index) => (
            <section
              key={section.heading ?? index}
              className={cn(
                index > 0 && 'border-t border-border pt-6 dark:border-border/60'
              )}
            >
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

        {hasSidebar ? (
          <aside className="flex w-full flex-col gap-6 lg:w-72 lg:shrink-0">
            {calendarWindows.length ? (
              <section aria-labelledby="guide-deadlines-title">
                <h2
                  id="guide-deadlines-title"
                  className="font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {copy.deadlinesTitle}
                </h2>
                <ul className="mt-3 space-y-2">
                  {calendarWindows.map((window) => (
                    <li
                      key={window.id}
                      className="portal-home-card flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl px-4 py-3"
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
              <section aria-labelledby="guide-models-title">
                <h2
                  id="guide-models-title"
                  className="font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {copy.relatedModelsTitle}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {relatedModels.map((model) => (
                    <li key={model.code}>
                      <Link
                        href={`/guias/modelos-aeat?modelo=${model.code}`}
                        className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.06] px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary/55 hover:bg-primary/[0.06] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-foreground/20 dark:bg-foreground/10"
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
          </aside>
        ) : null}
      </div>
    </div>
  )
}
