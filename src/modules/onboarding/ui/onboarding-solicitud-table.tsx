'use client'

import { useMemo } from 'react'

import type { OnboardingSolicitudRow } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { ClosedSolicitudesTable } from '@/src/modules/onboarding/ui/closed-solicitudes-table'
import { PendingSolicitudesTable } from '@/src/modules/onboarding/ui/pending-solicitudes-table'

export type SolicitudListFilter = 'pending' | 'closed'

export function OnboardingSolicitudTable({
  rows,
  filter,
  onUpdated,
}: {
  rows: OnboardingSolicitudRow[]
  filter: SolicitudListFilter
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const filteredRows = useMemo(() => {
    if (filter === 'closed') return rows.filter((row) => row.status !== 'active')
    return rows.filter((row) => row.status === 'active')
  }, [filter, rows])

  if (filter === 'closed') {
    return <ClosedSolicitudesTable rows={filteredRows} onUpdated={onUpdated} />
  }
  return <PendingSolicitudesTable rows={filteredRows} onUpdated={onUpdated} />
}
