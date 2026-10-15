'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bug,
  ChevronDown,
  EllipsisVertical,
  LogOut,
  PersonStanding,
  PlayCircle,
  UserCog,
  UserPlus,
} from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { SignOutOverlayPortal } from '@/src/modules/auth/ui/sign-out-button'
import { useSignOut } from '@/src/modules/auth/ui/use-sign-out'
import { AccessibilityControls } from '@/src/modules/portal/ui/accessibility-controls'
import { usePortalInviteOptional } from '@/src/modules/invitations/ui/portal-invite-context'
import { useOnboardingChecklistOptional } from '@/src/modules/portal/ui/onboarding-checklist-context'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { usePortalReportProblemOptional } from '@/src/modules/portal/ui/portal-report-problem-context'

const copy = portal.shell.profileMenu
const accessibilityCopy = portal.shell.accessibility
const reportProblemCopy = portal.shell.reportProblem
const inviteCopy = portal.shell.invite

type PortalProfileMenuProps = {
  user: PortalUser
  roleLabel: string
  collapsed: boolean
  onNavigate?: (href: string) => void
}

const ITEM_CLASS =
  'flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none'

/**
 * Pie del sidebar: icono, nombre y rol del perfil con un menú que agrupa
 * configurar perfil, ver los primeros pasos y cerrar sesión. Todo el contenedor
 * (y los tres puntos) abren el panel.
 */
export function PortalProfileMenu({
  user,
  roleLabel,
  collapsed,
  onNavigate,
}: PortalProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [accessibilityOpen, setAccessibilityOpen] = useState(false)
  const onboardingChecklist = useOnboardingChecklistOptional()
  const { signOut, signingOut, busy: signOutBusy } = useSignOut()
  const reportProblem = usePortalReportProblemOptional()
  const invite = usePortalInviteOptional()
  // El reporte de problemas solo existe para cliente y colaborador.
  const canReportProblem = user.role === 'client' || user.role === 'worker'
  const initial = user.name.trim().charAt(0).toUpperCase() || '?'
  const isClient = user.role === 'client'
  const fullLabel = `${user.name} · ${roleLabel}`

  const avatar = (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-sm font-semibold text-sidebar-active-foreground"
      aria-hidden
    >
      {initial}
    </span>
  )

  const trigger = (
    <button
      type="button"
      aria-label={`${copy.triggerLabel}: ${fullLabel}`}
      aria-haspopup="menu"
      aria-expanded={open}
      className={cn(
        'group flex w-full cursor-pointer items-center rounded-lg text-left transition-colors',
        'hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
        open && 'bg-sidebar-accent',
        collapsed ? 'justify-center p-1.5' : 'gap-3 p-2'
      )}
    >
      {avatar}
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </span>
            <span className="block truncate text-xs text-sidebar-muted-foreground">
              {roleLabel}
            </span>
          </span>
          <EllipsisVertical
            className="size-4 shrink-0 text-sidebar-muted-foreground transition-colors group-hover:text-sidebar-foreground"
            aria-hidden
          />
        </>
      )}
    </button>
  )

  return (
    <>
      <SignOutOverlayPortal active={signingOut} />
      <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setAccessibilityOpen(false)
      }}
    >
      {collapsed ? (
        <PortalActionTooltip content={fullLabel} side="right">
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        </PortalActionTooltip>
      ) : (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      )}
      <PopoverContent
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'end' : 'start'}
        sideOffset={8}
        className="max-h-[min(36rem,calc(100dvh-2rem))] w-72 overflow-y-auto border-sidebar-border bg-sidebar p-1.5 text-sidebar-foreground"
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.name}</p>
          <p className="truncate text-xs text-sidebar-muted-foreground">{user.email}</p>
        </div>
        <div className="my-1 border-t border-sidebar-border" role="separator" />

        {isClient ? (
          <Link
            href="/perfil"
            className={ITEM_CLASS}
            onClick={() => {
              onNavigate?.('/perfil')
              setOpen(false)
            }}
          >
            <UserCog className="size-4 shrink-0" aria-hidden />
            {copy.settings}
          </Link>
        ) : null}

        {isClient && onboardingChecklist ? (
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => {
              onboardingChecklist.start()
              setOpen(false)
            }}
          >
            <PlayCircle className="size-4 shrink-0" aria-hidden />
            {portal.onboardingChecklist.reopenLabel}
          </button>
        ) : null}

        {isClient && invite ? (
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => {
              setOpen(false)
              invite.openInvite()
            }}
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {inviteCopy.label}
          </button>
        ) : null}

        <div className="my-1 border-t border-sidebar-border" role="separator" />

        <button
          type="button"
          className={ITEM_CLASS}
          aria-expanded={accessibilityOpen}
          onClick={() => setAccessibilityOpen((value) => !value)}
        >
          <PersonStanding className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{accessibilityCopy.title}</span>
          <ChevronDown
            className={cn('size-4 shrink-0 transition-transform', accessibilityOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        {accessibilityOpen ? (
          <div className="dark mt-1 rounded-md bg-sidebar-accent/40 py-2">
            <AccessibilityControls />
          </div>
        ) : null}

        {canReportProblem && reportProblem ? (
          <button
            type="button"
            className={ITEM_CLASS}
            onClick={() => {
              setOpen(false)
              reportProblem.openReportProblem()
            }}
          >
            <Bug className="size-4 shrink-0" aria-hidden />
            {reportProblemCopy.label}
          </button>
        ) : null}

        <div className="my-1 border-t border-sidebar-border" role="separator" />

        <button
          type="button"
          className={cn(ITEM_CLASS, 'disabled:cursor-not-allowed')}
          disabled={signOutBusy}
          onClick={() => {
            // El panel se cierra y la despedida va a pantalla completa (fuera del panel).
            setOpen(false)
            signOut()
          }}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {portal.shell.signOutLabel}
        </button>
      </PopoverContent>
    </Popover>
    </>
  )
}
