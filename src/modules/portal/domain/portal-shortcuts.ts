export type PortalShortcutDefinition = {
  id: string
  alt?: boolean
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
  key: string
}

export const PORTAL_REFRESH_SHORTCUT: PortalShortcutDefinition = {
  id: 'refresh',
  alt: true,
  key: 'r',
}

export const PORTAL_SHORTCUTS = {
  refresh: PORTAL_REFRESH_SHORTCUT,
} as const

export function getPortalShortcutKeys(
  shortcut: PortalShortcutDefinition
): string[] {
  const keys: string[] = []
  if (shortcut.alt) keys.push('Alt')
  if (shortcut.ctrl) keys.push('Ctrl')
  if (shortcut.shift) keys.push('Shift')
  if (shortcut.meta) keys.push('⌘')
  keys.push(shortcut.key.toUpperCase())
  return keys
}

/** Teclas de acción (sin modificadores), para mostrar con Alt ya pulsado. */
export function getPortalShortcutActionKeys(
  shortcut: PortalShortcutDefinition
): string[] {
  return [shortcut.key.toUpperCase()]
}

export function formatPortalShortcutLabel(
  shortcut: PortalShortcutDefinition
): string {
  return getPortalShortcutKeys(shortcut).join('+')
}

export function matchesPortalShortcut(
  event: KeyboardEvent,
  shortcut: PortalShortcutDefinition
): boolean {
  const wantsAlt = shortcut.alt ?? false
  const wantsCtrl = shortcut.ctrl ?? false
  const wantsShift = shortcut.shift ?? false
  const wantsMeta = shortcut.meta ?? false

  if (event.altKey !== wantsAlt) return false
  if (event.ctrlKey !== wantsCtrl) return false
  if (event.shiftKey !== wantsShift) return false
  if (event.metaKey !== wantsMeta) return false

  return event.key.toLowerCase() === shortcut.key.toLowerCase()
}

export function isPortalShortcutBlockedTarget(
  target: EventTarget | null
): boolean {
  if (!(target instanceof HTMLElement)) return false

  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true

  return false
}
