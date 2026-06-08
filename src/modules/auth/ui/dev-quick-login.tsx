'use client'

import { useTransition } from 'react'

import { MarketingButton } from '@/components/ui/marketing-button'
import { portal } from '@/content/portal'
import { signInAsDemoRoleAction } from '@/src/modules/auth/application/sign-in'
import type { PortalRole } from '@/src/modules/auth/domain/types'

const DEMO_ROLES: PortalRole[] = ['client', 'admin', 'advisor']

export function DevQuickLogin() {
  const [pending, startTransition] = useTransition()

  return (
    <div className="mt-5 rounded-xl border border-agua/20 bg-card/30 px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-on-dark uppercase">
        {portal.login.devQuickLogin.title}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {DEMO_ROLES.map((role) => (
          <MarketingButton
            key={role}
            type="button"
            marketingVariant="secondary"
            className="h-10 flex-1 rounded-lg text-sm"
            disabled={pending}
            onClick={() => {
              startTransition(() => {
                void signInAsDemoRoleAction(role)
              })
            }}
          >
            {portal.login.devQuickLogin[role]}
          </MarketingButton>
        ))}
      </div>
    </div>
  )
}
