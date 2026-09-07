'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { leads as leadsCopy } from '@/content/leads'
import type { LeadContactCandidate } from '@/src/modules/leads/domain/types'
import { formatEuro } from '@/src/modules/leads/ui/lead-format'
import { LeadContactDrawer } from '@/src/modules/leads/ui/lead-contact-drawer'
import { LeadEstadoBadge } from '@/src/modules/leads/ui/lead-estado-badge'

type LeadsContactListProps = {
  candidates: LeadContactCandidate[]
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function contactedLabel(lastContactedAt: string): string {
  const days = daysSince(lastContactedAt)
  return days === 0
    ? leadsCopy.contact.alreadyContactedToday
    : leadsCopy.contact.alreadyContactedDays.replace('{days}', String(days))
}

export function LeadsContactList({ candidates }: LeadsContactListProps) {
  const router = useRouter()
  const copy = leadsCopy.contact
  const [activeCandidate, setActiveCandidate] = useState<LeadContactCandidate | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function openDrawer(candidate: LeadContactCandidate) {
    setActiveCandidate(candidate)
    setDrawerOpen(true)
  }

  return (
    <div className="portal-home-card rounded-xl p-5">
      <h2 className="font-sans text-base font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>

      {candidates.length === 0 ? (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-foreground">{copy.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.emptyDescription}</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {candidates.map((candidate) => (
            <li
              key={candidate.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">
                    {candidate.nombre ?? candidate.email}
                  </p>
                  <LeadEstadoBadge estado={candidate.estado} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {candidate.email}
                  {candidate.totalMensual != null
                    ? ` · ${formatEuro(candidate.totalMensual)}/mes`
                    : ''}
                </p>
                {candidate.lastContactedAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {contactedLabel(candidate.lastContactedAt)}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => openDrawer(candidate)}
              >
                <Mail className="size-4" aria-hidden />
                {copy.button}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <LeadContactDrawer
        candidate={activeCandidate}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
