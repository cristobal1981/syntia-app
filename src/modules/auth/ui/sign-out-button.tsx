'use client'

import { LogOut } from 'lucide-react'
import { createPortal } from 'react-dom'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { AuthSessionOverlay } from '@/src/modules/auth/ui/auth-session-overlay'
import { useSignOut } from '@/src/modules/auth/ui/use-sign-out'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

type SignOutButtonProps = {
  collapsed?: boolean
}

/** La despedida se pinta en `document.body`: dentro de un menú animado (transform) quedaría recortada. */
export function SignOutOverlayPortal({ active }: { active: boolean }) {
  if (!active || typeof document === 'undefined') return null
  return createPortal(<AuthSessionOverlay variant="sign-out" />, document.body)
}

export function SignOutButton({ collapsed = false }: SignOutButtonProps) {
  const { signOut, signingOut, busy } = useSignOut()

  const button = (
    <button
      type="button"
      disabled={busy}
      onClick={signOut}
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
      <SignOutOverlayPortal active={signingOut} />
      <div className={cn(collapsed && 'w-auto')}>
        {collapsed ? (
          <PortalActionTooltip content={portal.shell.signOutLabel}>{button}</PortalActionTooltip>
        ) : (
          button
        )}
      </div>
    </>
  )
}
