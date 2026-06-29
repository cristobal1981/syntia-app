'use client'

import { profile } from '@/content/profile'
import { cn } from '@/lib/utils'
import type { AssignedAdvisor } from '@/src/modules/profile/domain/types'
import { AdvisorPresenceDot } from '@/src/modules/profile/ui/advisor-presence-dot'
import { useAdvisorPresence } from '@/src/modules/profile/ui/use-advisor-presence'
import { ChatterAuthorAvatar } from '@/src/modules/portal/ui/chatter-author-avatar'

type ProfileAssignedAdvisorCardProps = {
  advisor: AssignedAdvisor
  className?: string
}

function advisorInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

export function ProfileAssignedAdvisorCard({
  advisor,
  className,
}: ProfileAssignedAdvisorCardProps) {
  const { presence, loading } = useAdvisorPresence(advisor.partnerId)
  const presenceLabel = presence ? profile.advisorPresence[presence] : null

  return (
    <aside
      className={cn(
        'order-first rounded-xl border border-border bg-card p-5 md:p-6 lg:order-last lg:sticky lg:top-6',
        className
      )}
      aria-labelledby="profile-advisor-heading"
    >
      <h2
        id="profile-advisor-heading"
        className="font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {profile.sections.assignedAdvisor}
      </h2>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            {advisor.partnerId ? (
              <ChatterAuthorAvatar
                name={advisor.name}
                partnerId={advisor.partnerId}
                size="lg"
                priority
              />
            ) : (
              <div
                className="flex size-12 items-center justify-center rounded-full bg-primary/12 font-sans text-base font-semibold text-primary"
                aria-hidden
              >
                {advisorInitial(advisor.name)}
              </div>
            )}
            {!loading && presence ? (
              <AdvisorPresenceDot
                status={presence}
                className="absolute -right-0.5 -bottom-0.5 size-3"
              />
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="font-sans text-base font-semibold leading-snug text-foreground">
              {advisor.name}
            </p>
            {!loading && presenceLabel ? (
              <p className="mt-1 text-xs text-muted-foreground">{presenceLabel}</p>
            ) : null}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {profile.assignedAdvisorHint}
        </p>
      </div>
    </aside>
  )
}
