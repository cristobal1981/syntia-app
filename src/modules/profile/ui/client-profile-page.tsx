'use client'

import { profile } from '@/content/profile'
import type {
  AssignedAdvisor,
  ClientProfile,
} from '@/src/modules/profile/domain/types'
import { ProfileCard } from '@/src/modules/profile/ui/profile-card'
import { ProfileDataSection } from '@/src/modules/profile/ui/profile-data-section'
import { ProfileIdentity } from '@/src/modules/profile/ui/profile-identity'
import { ProfileRequestChangeButton } from '@/src/modules/profile/ui/profile-request-change-button'
import { PushNotificationsSection } from '@/src/modules/push/ui/push-notifications-section'
import { ColaboradoresSection } from '@/src/modules/colaboradores/ui/colaboradores-section'
import type { WorkerRecord } from '@/src/modules/colaboradores/domain/types'

type ClientProfilePageProps = {
  initialProfile: ClientProfile
  assignedAdvisor: AssignedAdvisor | null
  ownerEmail: string
  workersEnabled: boolean
  maxWorkers: number
  workers: WorkerRecord[]
  showPushSettings?: boolean
}

export function ClientProfilePage({
  initialProfile,
  assignedAdvisor,
  ownerEmail,
  workersEnabled,
  maxWorkers,
  workers,
  showPushSettings = true,
}: ClientProfilePageProps) {
  return (
    <div className="flex flex-col gap-8">
      <ProfileIdentity profile={initialProfile} assignedAdvisor={assignedAdvisor} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ProfileCard
          id="profile-data"
          title={profile.sections.data}
          description={profile.pageDescription}
          action={<ProfileRequestChangeButton />}
        >
          <ProfileDataSection initialProfile={initialProfile} />
        </ProfileCard>

        <ProfileCard id="profile-settings" title={profile.sections.settings}>
          <div className="divide-y divide-border dark:divide-border/50">
            {showPushSettings ? <PushNotificationsSection /> : null}
            <ColaboradoresSection
              ownerEmail={ownerEmail}
              workersEnabled={workersEnabled}
              maxWorkers={maxWorkers}
              workers={workers}
            />
          </div>
        </ProfileCard>
      </div>
    </div>
  )
}
