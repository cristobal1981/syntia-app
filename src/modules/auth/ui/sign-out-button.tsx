'use client'

import { LogOut } from 'lucide-react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { signOut } from '@/src/modules/auth/application/sign-out'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

type SignOutButtonProps = {
  collapsed?: boolean
}

export function SignOutButton({ collapsed = false }: SignOutButtonProps) {
  const button = (
    <button
      type="submit"
      className={cn(
        'flex min-h-10 items-center rounded-md text-sm text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
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
    <form action={signOut} className={cn(collapsed && 'w-auto')}>
      {collapsed ? (
        <PortalActionTooltip content={portal.shell.signOutLabel}>
          {button}
        </PortalActionTooltip>
      ) : (
        button
      )}
    </form>
  )
}
