'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { solicitudes } from '@/content/solicitudes'
import type { OnboardingSolicitudRow } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { AltaAutonomoCreateDialog } from '@/src/modules/onboarding/ui/alta-autonomo-create-dialog'
import {
  OnboardingSolicitudTable,
  type SolicitudListFilter,
} from '@/src/modules/onboarding/ui/onboarding-solicitud-table'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

type SolicitudesPageViewProps = {
  initialRows: OnboardingSolicitudRow[]
}

export function SolicitudesPageView({ initialRows }: SolicitudesPageViewProps) {
  const copy = solicitudes.page
  const altaCopy = solicitudes.altaAutonomo
  const listCopy = solicitudes.list
  const [rows, setRows] = useState(initialRows)
  const [filter, setFilter] = useState<SolicitudListFilter>('pending')
  const [createOpen, setCreateOpen] = useState(false)

  const pendingCount = useMemo(
    () => rows.filter((row) => row.status === 'active').length,
    [rows]
  )
  const closedCount = rows.length - pendingCount

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {copy.description}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <PortalFilterChip
              label={listCopy.filterPending}
              count={pendingCount}
              active={filter === 'pending'}
              onClick={() => setFilter('pending')}
            />
            <PortalFilterChip
              label={listCopy.filterClosed}
              count={closedCount}
              active={filter === 'closed'}
              onClick={() => setFilter('closed')}
            />
          </div>
          <Button
            type="button"
            className="gap-2 self-start sm:self-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            {altaCopy.newButton}
          </Button>
        </div>

        <OnboardingSolicitudTable rows={rows} filter={filter} onUpdated={setRows} />
      </div>

      <AltaAutonomoCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setRows}
      />
    </div>
  )
}
