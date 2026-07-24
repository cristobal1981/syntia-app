'use client'

import { Check } from 'lucide-react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import type { PasswordRequirementStatus } from '@/src/modules/auth/domain/password-policy'

type PasswordRequirementsChecklistProps = {
  status: PasswordRequirementStatus
}

function RequirementRow({
  met,
  label,
}: {
  met: boolean
  label: string
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 text-xs transition-colors',
        met ? 'text-primary' : 'text-muted-on-dark'
      )}
    >
      <span
        className={cn(
          'flex size-3.5 shrink-0 items-center justify-center rounded-full border',
          met
            ? 'border-primary bg-primary/15 text-primary'
            : 'border-agua/30 bg-transparent'
        )}
        aria-hidden
      >
        {met ? <Check className="size-2 stroke-[3]" /> : null}
      </span>
      <span>{label}</span>
    </li>
  )
}

export function PasswordRequirementsChecklist({
  status,
}: PasswordRequirementsChecklistProps) {
  const copy = portal.reset.passwordRequirements

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-on-dark">{copy.intro}</p>
      <ul className="flex flex-col gap-1.5" aria-live="polite">
        <RequirementRow met={status.minLength} label={copy.minLength} />
        <RequirementRow met={status.uppercase} label={copy.uppercase} />
        <RequirementRow met={status.lowercase} label={copy.lowercase} />
        <RequirementRow met={status.digit} label={copy.digit} />
        <RequirementRow met={status.symbol} label={copy.symbol} />
      </ul>
    </div>
  )
}
