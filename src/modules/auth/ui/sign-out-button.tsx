'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { portal } from '@/content/portal'
import { waitRemainingMinDuration } from '@/lib/wait-min-display'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/src/modules/auth/application/sign-out'
import { AuthSessionOverlay } from '@/src/modules/auth/ui/auth-session-overlay'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

type SignOutButtonProps = {
  collapsed?: boolean
}

export function SignOutButton({ collapsed = false }: SignOutButtonProps) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleSignOut = () => {
    if (pending || signingOut) return

    setSigningOut(true)
    const startedAt = Date.now()

    startTransition(async () => {
      try {
        await signOutAction()
        await waitRemainingMinDuration(
          startedAt,
          portal.authLoading.signOutMinDisplayMs
        )
        router.push('/login')
        router.refresh()
      } catch {
        setSigningOut(false)
      }
    })
  }

  const button = (
    <button
      type="button"
      disabled={pending || signingOut}
      onClick={handleSignOut}
      className={cn(
        'flex min-h-10 cursor-pointer items-center rounded-md text-sm text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none disabled:cursor-not-allowed',
        collapsed ? 'size-10 justify-center px-0' : 'w-full gap-3 px-3 text-left'
      )}
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {collapsed ? (
        <span className="sr-only">{portal.shell.signOutLabel}</span>
      ) : (
        <span>{portal.shell.signOutLabel}</span>
      )}
    </button>
  )

  return (
    <>
      {signingOut ? <AuthSessionOverlay variant="sign-out" /> : null}
      <div className={cn(collapsed && 'w-auto')}>
        {collapsed ? (
          <PortalActionTooltip content={portal.shell.signOutLabel}>
            {button}
          </PortalActionTooltip>
        ) : (
          button
        )}
      </div>
    </>
  )
}
