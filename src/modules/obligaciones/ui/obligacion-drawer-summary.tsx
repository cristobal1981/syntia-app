import {
  AlarmClock,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  ExternalLink,
  UserRound,
} from 'lucide-react'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { fiscalModelSources } from '@/content/fiscal-models-guide'
import { obligaciones } from '@/content/obligaciones'
import { cn } from '@/lib/utils'
import type { ObligacionListRowWithDeadline } from '@/src/modules/obligaciones/domain/categorize-obligaciones'
import {
  extractModelCodeFromLabel,
  getFiscalModelGuideByCode,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import { getDaysUntilObligacionDeadline } from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'

const copy = obligaciones.detail

function formatDeadlineDistance(days: number): string {
  if (days === 0) return copy.daysToday
  if (days === 1) return copy.daysOne
  if (days > 1) return copy.daysMany.replace('{count}', String(days))
  if (days === -1) return copy.daysOverdueOne
  return copy.daysOverdueMany.replace('{count}', String(Math.abs(days)))
}

type ObligacionDrawerFactsProps = {
  row: ObligacionListRowWithDeadline
}

/**
 * Cabecera de datos de una obligación: el plazo legal (el deducido de
 * `tax-calendar`, no el `date_deadline` interno de Odoo) manda, y periodo y
 * fase quedan como línea de apoyo. Una obligación ya presentada no repite
 * un plazo que ya no importa.
 */
export function ObligacionDrawerFacts({ row }: ObligacionDrawerFactsProps) {
  const closed = isTaskClosed(row.state)
  const showDeadline = !closed && row.deadline !== null
  const days = row.deadline ? getDaysUntilObligacionDeadline(row.deadline) : null
  const urgent = row.deadlineStatus === 'overdue' || row.deadlineStatus === 'dueSoon'

  const meta = [row.periodLabel, row.yearLabel, row.stageName].filter(Boolean)

  const dateLabel = row.deadline?.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const LeadIcon = closed ? CalendarCheck : urgent ? AlarmClock : CalendarClock

  return (
    <div className="flex items-start gap-3 border-b border-border px-6 py-4">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 dark:bg-muted/40"
        aria-hidden
      >
        <LeadIcon
          className={cn(
            'size-[18px]',
            row.deadlineStatus === 'overdue'
              ? 'text-destructive'
              : 'text-muted-foreground'
          )}
        />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        {showDeadline && dateLabel && days !== null ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-base font-semibold text-foreground">
              {(days < 0 ? copy.deadlinePastOn : copy.deadlineOn).replace(
                '{date}',
                dateLabel
              )}
            </p>
            <span
              className={cn(
                urgent
                  ? 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium'
                  : 'text-sm text-muted-foreground',
                row.deadlineStatus === 'overdue' && 'badge-status-canceled',
                row.deadlineStatus === 'dueSoon' && 'badge-status-changes-requested'
              )}
            >
              {formatDeadlineDistance(days)}
            </span>
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">{meta.join(' · ')}</p>
      </div>
    </div>
  )
}

/**
 * Qué es el modelo y quién lo presenta, desde la guía de modelos. Va al
 * final del drawer: es contexto de lectura, no la tarea (los documentos).
 * Sin ficha en la guía, no pinta nada.
 */
export function ObligacionDrawerModelInfo({ row }: ObligacionDrawerFactsProps) {
  const modelCode = extractModelCodeFromLabel(row.name)
  const guide = modelCode ? getFiscalModelGuideByCode(modelCode) : undefined
  if (!guide) return null

  const source = fiscalModelSources[guide.authority]

  return (
    <section
      aria-labelledby="obligacion-about-heading"
      className="mt-2 flex flex-col gap-4 border-t border-border px-6 py-5"
    >
      <div className="flex flex-col gap-1.5">
        <h3
          id="obligacion-about-heading"
          className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground"
        >
          <BookOpen className="size-4 text-muted-foreground" aria-hidden />
          {copy.aboutTitle}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {guide.description}
        </p>
      </div>

      {guide.whoFiles || guide.deadline ? (
        <dl className="flex flex-col gap-3">
          {guide.whoFiles ? (
            <div className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UserRound className="size-3.5" aria-hidden />
                {copy.whoFiles}
              </dt>
              <dd className="text-sm text-foreground">{guide.whoFiles}</dd>
            </div>
          ) : null}
          {guide.deadline ? (
            <div className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarRange className="size-3.5" aria-hidden />
                {copy.guideDeadline}
              </dt>
              <dd className="text-sm text-foreground">{guide.deadline}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="flex flex-col items-start gap-1.5 text-sm">
        <AppLink href="/guias/modelos-aeat" className={cn(appLinkPortalClassName)}>
          {copy.openGuide}
        </AppLink>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className={cn('inline-flex items-center gap-1.5', appLinkPortalClassName)}
        >
          {source.label}
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </a>
      </div>
    </section>
  )
}
