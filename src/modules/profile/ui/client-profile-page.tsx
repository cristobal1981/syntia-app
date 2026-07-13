'use client'

import type {
  AssignedAdvisor,
  ClientProfile,
} from '@/src/modules/profile/domain/types'
import { ProfileSummaryView } from '@/src/modules/profile/ui/profile-summary-view'

type ClientProfilePageProps = {
  initialProfile: ClientProfile
  assignedAdvisor: AssignedAdvisor | null
}

export function ClientProfilePage({
  initialProfile,
  assignedAdvisor,
}: ClientProfilePageProps) {
  return (
    <ProfileSummaryView
      initialProfile={initialProfile}
      assignedAdvisor={assignedAdvisor}
    />
  )
}
