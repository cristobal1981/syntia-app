'use client'

import { WifiOff } from 'lucide-react'

import { portal } from '@/content/portal'
import { usePortalOffline } from '@/src/modules/portal/ui/portal-connectivity-store'

export function PortalOfflineBanner() {
  if (!usePortalOffline()) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-9 shrink-0 items-center justify-center gap-2 border-b border-border bg-muted px-4 py-1.5 text-center text-sm text-foreground"
    >
      <WifiOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{portal.offline.message}</span>
    </div>
  )
}
