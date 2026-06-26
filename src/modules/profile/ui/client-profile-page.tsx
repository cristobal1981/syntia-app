'use client'

import type { ClientProfile } from '@/src/modules/profile/domain/types'
import { ProfileSummaryView } from '@/src/modules/profile/ui/profile-summary-view'

type ClientProfilePageProps = {
  initialProfile: ClientProfile
}

export function ClientProfilePage({ initialProfile }: ClientProfilePageProps) {
  return <ProfileSummaryView initialProfile={initialProfile} />
}
