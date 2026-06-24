'use client'

import { Loader2 } from 'lucide-react'

import { portal } from '@/content/portal'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'

export function NotificationNavigationOverlay() {
  const notifications = useChatterNotificationsOptional()
  const pending = notifications?.pendingNavigation

  if (!pending) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="portal-home-card flex max-w-sm flex-col items-center gap-3 rounded-xl px-6 py-5 text-center shadow-lg">
        <Loader2
          className="size-8 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {portal.notifications.openingConversation}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {pending.name}
          </p>
        </div>
      </div>
    </div>
  )
}
