'use client'

import { Button } from '@/components/ui/button'
import { obligaciones } from '@/content/obligaciones'
import type { ObligacionModelGroup } from '@/src/modules/obligaciones/domain/group-obligaciones-by-model'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'
import type { ObligacionListRow } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'
import type { ObligacionTask } from '@/src/modules/obligaciones/domain/types'
import { PortalDocumentsCell } from '@/src/modules/portal/ui/portal-documents-cell'
import {
  ListPagination,
  paginateItems,
} from '@/src/modules/portal/ui/list-pagination'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'

const MODEL_GROUPS_PAGE_SIZE = 10

type ObligacionModelGroupsListProps = {
  groups: ObligacionModelGroup[]
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
  group: ObligacionModelGroup
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
  entry: ObligacionListRow
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

  return (
    <tr
      className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
      onClick={() => onOpenTask(entry)}
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
      <td className="px-4 py-3">
        <PortalDocumentsCell count={entry.attachmentCount} />
      </td>
      <td className="w-px whitespace-nowrap px-4 py-3 text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onOpenTask(entry)
          }}
          aria-label={`${copy.list.viewDocuments}: ${modelLabel} · ${entry.periodLabel}`}
        >
          {copy.list.viewDocuments}
        </Button>
      </td>
    </tr>
  )
}
