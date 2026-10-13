export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false

  return (
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    navigator.platform?.includes('Mac') === true
  )
}

/**
 * En macOS usamos ⌘; en Windows/Linux, Alt (⌥ en teclados Mac).
 *
 * `keepAltOnMac` evita esa traducción: el atajo se queda como Option físico
 * también en Mac. Úsalo cuando la letra elegida choque con un atajo de ⌘
 * reservado por el sistema o el navegador (Cmd+Q para salir, Cmd+N para
 * nueva ventana, etc.) — Option apenas se usa como modificador de atajos de
 * aplicación, así que ese espacio está mucho más libre.
 */
export function resolvePortalShortcutModifier(
  shortcut: { alt?: boolean; meta?: boolean; keepAltOnMac?: boolean }
): 'alt' | 'meta' | null {
  if (shortcut.meta) return 'meta'
  if (shortcut.alt) {
    if (shortcut.keepAltOnMac) return 'alt'
    return isMacPlatform() ? 'meta' : 'alt'
  }
  return null
}

/** Etiqueta del modificador resuelto para ESTE atajo concreto (a diferencia
 * de getPortalShortcutModifierLabel, que asume la convención global ⌘/Alt). */
export function getPortalShortcutModifierLabelFor(
  shortcut: { alt?: boolean; meta?: boolean; keepAltOnMac?: boolean }
): string {
  const modifier = resolvePortalShortcutModifier(shortcut)
  if (modifier === 'meta') return '⌘'
  if (modifier === 'alt') return isMacPlatform() ? '⌥' : 'Alt'
  return ''
}

export function portalShortcutPhysicalCode(key: string): string | null {
  if (key.length === 1 && /[a-z]/i.test(key)) {
    return `Key${key.toUpperCase()}`
  }
  return null
}

export function isPortalShortcutModifierHeld(event: KeyboardEvent): boolean {
  if (isMacPlatform()) {
    return event.metaKey || event.altKey
  }
  return event.altKey
}

export function isPortalShortcutModifierKeyEvent(event: KeyboardEvent): boolean {
  if (event.key === 'Alt' || event.key === 'AltGraph') return true
  if (isMacPlatform() && (event.key === 'Meta' || event.key === 'OS')) {
    return true
  }
  return false
}

export function getPortalShortcutModifierLabel(): string {
  return isMacPlatform() ? '⌘' : 'Alt'
}

export function buildPortalShortcutTooltipCopy(
  copy: { buttonHintIdle: string; buttonHintActive: string },
  action: string,
  shortcutLabel: string,
  modifier: string = getPortalShortcutModifierLabel()
): { idle: string; active: string } {
  return {
    idle: copy.buttonHintIdle
      .replace('{action}', action)
      .replace('{modifier}', modifier),
    active: copy.buttonHintActive
      .replace('{action}', action)
      .replace('{shortcut}', shortcutLabel),
  }
}

export function getPortalShortcutOverlayHint(): string {
  const modifier = getPortalShortcutModifierLabel()
  return `Mantén ${modifier} · Pulsa la tecla resaltada en cada botón`
}
