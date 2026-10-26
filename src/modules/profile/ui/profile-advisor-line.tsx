'use client'

import { profile } from '@/content/profile'
import type { AssignedAdvisor } from '@/src/modules/profile/domain/types'
import { AdvisorPresenceDot } from '@/src/modules/profile/ui/advisor-presence-dot'
import { useAdvisorPresence } from '@/src/modules/profile/ui/use-advisor-presence'

/** Dato de conocimiento, sin peso: quién es el asesor de referencia y si está conectado. */
export function ProfileAdvisorLine({ advisor }: { advisor: AssignedAdvisor }) {
  const { presence, loading } = useAdvisorPresence(advisor.partnerId)
  const presenceLabel = presence ? profile.advisorPresence[presence] : null

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <span>{profile.sections.assignedAdvisor}:</span>
      <span className="font-medium text-foreground/80">{advisor.name}</span>
      {!loading && presence ? (
        <>
          <AdvisorPresenceDot status={presence} withBorder={false} className="size-2" />
          <span>{presenceLabel}</span>
        </>
      ) : null}
    </p>
  )
}
