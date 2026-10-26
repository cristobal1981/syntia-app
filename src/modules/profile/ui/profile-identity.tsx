import { profile } from '@/content/profile'
import type { AssignedAdvisor, ClientProfile } from '@/src/modules/profile/domain/types'
import { ProfileAdvisorLine } from '@/src/modules/profile/ui/profile-advisor-line'

function getProfileInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

/** Quién eres: nombre y correo, y el asesor asignado como una línea discreta. */
export function ProfileIdentity({
  profile: data,
  assignedAdvisor,
}: {
  profile: ClientProfile
  assignedAdvisor: AssignedAdvisor | null
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/12 font-sans text-xl font-semibold text-primary"
        aria-hidden
      >
        {getProfileInitial(data.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-sans text-xl font-semibold text-foreground">{data.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {data.email || profile.emptyValue}
        </p>
        {assignedAdvisor ? <ProfileAdvisorLine advisor={assignedAdvisor} /> : null}
      </div>
    </div>
  )
}
