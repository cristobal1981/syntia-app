'use client'

import type { KeyboardEvent } from 'react'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { obligaciones } from '@/content/obligaciones'
import type { ObligacionListRowWithDeadline } from '@/src/modules/obligaciones/domain/categorize-obligaciones'
import type { ObligacionModelGroup } from '@/src/modules/obligaciones/domain/group-obligaciones-by-model'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'
import type { ObligacionDeadlineStatus } from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import type { ObligacionTask } from '@/src/modules/obligaciones/domain/types'
import { PortalDocumentsCell } from '@/src/modules/portal/ui/portal-documents-cell'
import {
  ListPagination,
  paginateItems,
} from '@/src/modules/portal/ui/list-pagination'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'

const MODEL_GROUPS_PAGE_SIZE = 10

type ObligacionModelGroupsListProps = {
  groups: ObligacionModelGroup<ObligacionListRowWithDeadline>[]
  page: number
  onPageChange: (page: number) => void
  paginationId: string
  onOpenTask: (task: ObligacionTask) => void
}

export function ObligacionModelGroupsList({
  groups,
  page,
  onPageChange,
  paginationId,
  onOpenTask,
}: ObligacionModelGroupsListProps) {
  const copy = obligaciones
  const pageGroups = paginateItems(groups, page, MODEL_GROUPS_PAGE_SIZE)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {[
              copy.columns.name,
              copy.columns.period,
              copy.columns.stage,
              copy.columns.deadline,
              copy.columns.documents,
            ].map((header) => (
              <th
                key={header}
                scope="col"
                className="px-4 py-2.5 font-sans font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
            <th scope="col" className="w-px px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {pageGroups.map((group) => (
            <ModelGroupRows
              key={group.modelLabel}
              group={group}
              onOpenTask={onOpenTask}
            />
          ))}
        </tbody>
      </table>
      <ListPagination
        id={paginationId}
        page={page}
        pageSize={MODEL_GROUPS_PAGE_SIZE}
        totalItems={groups.length}
        onPageChange={onPageChange}
      />
    </div>
  )
}

type ModelGroupRowsProps = {
  group: ObligacionModelGroup<ObligacionListRowWithDeadline>
  onOpenTask: (task: ObligacionTask) => void
}

function ModelGroupRows({ group, onOpenTask }: ModelGroupRowsProps) {
  return (
    <>
      {group.entries.map((entry, index) => (
        <PeriodRow
          key={entry.id}
          entry={entry}
          modelLabel={group.modelLabel}
          showModelLabel={index === 0}
          rowSpan={group.entries.length}
          onOpenTask={onOpenTask}
        />
      ))}
    </>
  )
}

type PeriodRowProps = {
  entry: ObligacionListRowWithDeadline
  modelLabel: string
  showModelLabel: boolean
  rowSpan: number
  onOpenTask: (task: ObligacionTask) => void
}

function PeriodRow({
  entry,
  modelLabel,
  showModelLabel,
  rowSpan,
  onOpenTask,
}: PeriodRowProps) {
  const copy = obligaciones
  const stateBadge = getObligacionStateBadge(entry.state)

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpenTask(entry)
  }

  return (
    <tr
      className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      role="button"
      tabIndex={0}
      onClick={() => onOpenTask(entry)}
      onKeyDown={handleKeyDown}
      aria-label={`${copy.list.viewDocuments}: ${modelLabel} · ${entry.periodLabel}`}
    >
      {showModelLabel ? (
        <td
          rowSpan={rowSpan}
          className="border-r border-border bg-muted/10 px-4 py-3 align-top font-semibold text-foreground"
        >
          {modelLabel}
        </td>
      ) : null}
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
        {entry.periodLabel}
      </td>
      <td className="px-4 py-3">
        <TaskStateBadge label={stateBadge.label} variant={stateBadge.variant} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <ObligacionDeadlineCell deadline={entry.deadline} status={entry.deadlineStatus} />
      </td>
      <td className="px-4 py-3">
        <PortalDocumentsCell count={entry.attachmentCount} />
      </td>
      <td className="w-px whitespace-nowrap px-4 py-3 text-right">
        <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden />
      </td>
    </tr>
  )
}

type ObligacionDeadlineCellProps = {
  deadline: Date | null
  status: ObligacionDeadlineStatus
}

export function ObligacionDeadlineCell({ deadline, status }: ObligacionDeadlineCellProps) {
  const copy = obligaciones

  if (!deadline) {
    return <span className="text-muted-foreground">—</span>
  }

  const dateLabel = deadline.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  })

  // Fuera de "qué toca ahora" (p. ej. filas ya cerradas) el estado se fuerza
  // a "none" — aquí solo importa si hay fecha, no el badge de urgencia.
  if (status !== 'overdue' && status !== 'dueSoon') {
    return <span className="text-muted-foreground">{dateLabel}</span>
  }

  const badgeClassName =
    status === 'overdue' ? 'badge-status-canceled' : 'badge-status-changes-requested'
  const label =
    status === 'overdue' ? copy.deadlineStatus.overdue : copy.deadlineStatus.dueSoon

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        badgeClassName
      )}
    >
      {label} · {dateLabel}
    </span>
  )
}
