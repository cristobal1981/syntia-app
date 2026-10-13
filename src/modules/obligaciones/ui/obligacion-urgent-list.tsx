'use client'

import type { KeyboardEvent } from 'react'
import { ChevronRight, Scale } from 'lucide-react'

import { obligaciones } from '@/content/obligaciones'
import type { ObligacionListRowWithDeadline } from '@/src/modules/obligaciones/domain/categorize-obligaciones'
import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'
import type { ObligacionTask } from '@/src/modules/obligaciones/domain/types'
import { ObligacionDeadlineCell } from '@/src/modules/obligaciones/ui/obligacion-model-groups-list'
import { PortalDocumentsCell } from '@/src/modules/portal/ui/portal-documents-cell'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'

type ObligacionUrgentListProps = {
  rows: ObligacionListRowWithDeadline[]
  onOpenTask: (task: ObligacionTask) => void
}

export function ObligacionUrgentList({ rows, onOpenTask }: ObligacionUrgentListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <ObligacionUrgentItem key={row.id} row={row} onOpenTask={onOpenTask} />
      ))}
    </ul>
  )
}

type ObligacionUrgentItemProps = {
  row: ObligacionListRowWithDeadline
  onOpenTask: (task: ObligacionTask) => void
}

function ObligacionUrgentItem({ row, onOpenTask }: ObligacionUrgentItemProps) {
  const copy = obligaciones
  const modelLabel = formatObligacionModelLabel(row.name)
  const stateBadge = getObligacionStateBadge(row.state)

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpenTask(row)
  }

  return (
    <li>
      <article
        className="portal-home-card flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:gap-4"
        role="button"
        tabIndex={0}
        onClick={() => onOpenTask(row)}
        onKeyDown={handleKeyDown}
        aria-label={`${copy.list.viewDocuments}: ${modelLabel} · ${row.periodLabel}`}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
          aria-hidden
        >
          <Scale className="size-5 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="font-sans text-base font-semibold text-foreground">{modelLabel}</h3>
            <span className="text-sm text-muted-foreground">{row.periodLabel}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ObligacionDeadlineCell deadline={row.deadline} status={row.deadlineStatus} />
            <TaskStateBadge label={stateBadge.label} variant={stateBadge.variant} />
          </div>
        </div>

        {row.attachmentCount > 0 ? (
          <div className="hidden shrink-0 sm:block">
            <PortalDocumentsCell count={row.attachmentCount} />
          </div>
        ) : null}

        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </article>
    </li>
  )
}
