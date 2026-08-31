'use client'

import { useEffect, useRef } from 'react'

import {
  isPortalShortcutBlockedTarget,
  matchesPortalShortcut,
  type PortalShortcutDefinition,
} from '@/src/modules/portal/domain/portal-shortcuts'

type UsePortalShortcutOptions = {
  enabled?: boolean
  /**
   * Deja que el atajo se dispare incluso con el foco dentro de un
   * input/textarea/contentEditable (p. ej. el composer del chat). Solo
   * para atajos que nunca son texto legítimo a escribir (Alt+Q/P de
   * navegación) — Alt+R/N/K siguen bloqueados por defecto porque comparten
   * este hook y sí podrían chocar con entrada de texto real.
   */
  allowInEditableTarget?: boolean
}

export function usePortalShortcut(
  shortcut: PortalShortcutDefinition,
  onTrigger: () => void,
  options?: UsePortalShortcutOptions
) {
  const enabled = options?.enabled ?? true
  const allowInEditableTarget = options?.allowInEditableTarget ?? false
  const onTriggerRef = useRef(onTrigger)

  useEffect(() => {
    onTriggerRef.current = onTrigger
  })

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!matchesPortalShortcut(event, shortcut)) return
      if (!allowInEditableTarget && isPortalShortcutBlockedTarget(event.target)) {
        return
      }

      event.preventDefault()
      onTriggerRef.current()
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [enabled, shortcut, allowInEditableTarget])
}
