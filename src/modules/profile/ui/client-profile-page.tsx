'use client'

import type {
  AssignedAdvisor,
  ClientProfile,
} from '@/src/modules/profile/domain/types'
import { ProfileSummaryView } from '@/src/modules/profile/ui/profile-summary-view'
import { ColaboradoresSection } from '@/src/modules/colaboradores/ui/colaboradores-section'
import type { WorkerRecord } from '@/src/modules/colaboradores/domain/types'

type ClientProfilePageProps = {
  initialProfile: ClientProfile
  assignedAdvisor: AssignedAdvisor | null
  ownerEmail: string
  workersEnabled: boolean
  maxWorkers: number
  workers: WorkerRecord[]
}

export function ClientProfilePage({
  initialProfile,
  assignedAdvisor,
  ownerEmail,
  workersEnabled,
  maxWorkers,
  workers,
}: ClientProfilePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileSummaryView
        initialProfile={initialProfile}
        assignedAdvisor={assignedAdvisor}
      />
      <ColaboradoresSection
        ownerEmail={ownerEmail}
        workersEnabled={workersEnabled}
        maxWorkers={maxWorkers}
        workers={workers}
      />
    </div>
  )
}
