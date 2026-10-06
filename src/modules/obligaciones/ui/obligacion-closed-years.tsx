'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { obligaciones } from '@/content/obligaciones'
import { cn } from '@/lib/utils'
import type { ObligacionClosedYearGroup } from '@/src/modules/obligaciones/domain/categorize-obligaciones'
import { groupObligacionesByModel } from '@/src/modules/obligaciones/domain/group-obligaciones-by-model'
import type { ObligacionTask } from '@/src/modules/obligaciones/domain/types'
import { ObligacionModelGroupsList } from '@/src/modules/obligaciones/ui/obligacion-model-groups-list'

type ObligacionClosedYearsProps = {
  closedByYear: ObligacionClosedYearGroup[]
  onOpenTask: (task: ObligacionTask) => void
}

export function ObligacionClosedYears({ closedByYear, onOpenTask }: ObligacionClosedYearsProps) {
  return (
    <div className="flex flex-col gap-3">
      {closedByYear.map((yearGroup) => (
        <ClosedYearAccordion key={yearGroup.year} yearGroup={yearGroup} onOpenTask={onOpenTask} />
      ))}
    </div>
  )
}

type ClosedYearAccordionProps = {
  yearGroup: ObligacionClosedYearGroup
  onOpenTask: (task: ObligacionTask) => void
}

function ClosedYearAccordion({ yearGroup, onOpenTask }: ClosedYearAccordionProps) {
  const copy = obligaciones.closed
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const groups = groupObligacionesByModel(yearGroup.rows)
  const countLabel =
    yearGroup.rows.length === 1
      ? copy.countOne
      : copy.countMany.replace('{count}', String(yearGroup.rows.length))

  return (
    <section className="portal-home-card overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-muted/25"
        aria-expanded={open}
      >
        <div>
          <h3 className="font-sans text-base font-semibold text-foreground">
            {yearGroup.year > 0 ? yearGroup.year : obligaciones.yearFallbackLabel}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{countLabel}</p>
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-border px-4 py-4 dark:border-border">
          <ObligacionModelGroupsList
            groups={groups}
            page={page}
            onPageChange={setPage}
            paginationId={`obligaciones-hecho-${yearGroup.year}-pagination`}
            onOpenTask={onOpenTask}
          />
        </div>
      ) : null}
    </section>
  )
}
