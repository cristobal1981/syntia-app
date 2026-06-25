import {
  isMacPlatform,
  portalShortcutPhysicalCode,
  resolvePortalShortcutModifier,
} from '@/src/modules/portal/domain/portal-shortcut-platform'

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

export const PORTAL_CREATE_CONSULTA_SHORTCUT: PortalShortcutDefinition = {
  id: 'create-consulta',
  alt: true,
  key: 'n',
}

export const PORTAL_SHORTCUTS = {
  refresh: PORTAL_REFRESH_SHORTCUT,
  createConsulta: PORTAL_CREATE_CONSULTA_SHORTCUT,
} as const

export function getPortalShortcutKeys(
  shortcut: PortalShortcutDefinition
): string[] {
  const keys: string[] = []
  const modifier = resolvePortalShortcutModifier(shortcut)

  if (modifier === 'alt') keys.push('Alt')
  if (modifier === 'meta') keys.push('⌘')
  if (shortcut.ctrl) keys.push('Ctrl')
  if (shortcut.shift) keys.push('Shift')
  keys.push(shortcut.key.toUpperCase())
  return keys
}

/** Teclas de acción (sin modificadores), para mostrar con el modificador ya pulsado. */
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

function matchesPortalShortcutModifiers(
  event: KeyboardEvent,
  shortcut: PortalShortcutDefinition
): boolean {
  const wantsCtrl = shortcut.ctrl ?? false
  const wantsShift = shortcut.shift ?? false
  const modifier = resolvePortalShortcutModifier(shortcut)

  if (event.ctrlKey !== wantsCtrl) return false
  if (event.shiftKey !== wantsShift) return false

  if (modifier === 'meta') {
    if (isMacPlatform()) {
      return event.metaKey || event.altKey
    }
    return event.metaKey
  }

  if (modifier === 'alt') {
    if (!event.altKey) return false
    if (event.metaKey) return false
    return true
  }

  if (shortcut.meta && !event.metaKey) return false
  if (!shortcut.meta && event.metaKey) return false
  if (shortcut.alt && !event.altKey) return false
  if (!shortcut.alt && event.altKey) return false

  return true
}

export function matchesPortalShortcut(
  event: KeyboardEvent,
  shortcut: PortalShortcutDefinition
): boolean {
  if (!matchesPortalShortcutModifiers(event, shortcut)) return false

  const physicalCode = portalShortcutPhysicalCode(shortcut.key)
  if (physicalCode && event.code === physicalCode) return true

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
