'use client'

import { useEffect, useRef } from 'react'

import {
  isPortalShortcutBlockedTarget,
  matchesPortalShortcut,
  type PortalShortcutDefinition,
} from '@/src/modules/portal/domain/portal-shortcuts'

type UsePortalShortcutOptions = {
  enabled?: boolean
}

export function usePortalShortcut(
  shortcut: PortalShortcutDefinition,
  onTrigger: () => void,
  options?: UsePortalShortcutOptions
) {
  const enabled = options?.enabled ?? true
  const onTriggerRef = useRef(onTrigger)
  onTriggerRef.current = onTrigger

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!matchesPortalShortcut(event, shortcut)) return
      if (isPortalShortcutBlockedTarget(event.target)) return

      event.preventDefault()
      onTriggerRef.current()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, shortcut])
}
