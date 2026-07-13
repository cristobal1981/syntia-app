export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false

  return (
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    navigator.platform?.includes('Mac') === true
  )
}

/** En macOS usamos ⌘; en Windows/Linux, Alt (⌥ en teclados Mac). */
export function resolvePortalShortcutModifier(
  shortcut: { alt?: boolean; meta?: boolean }
): 'alt' | 'meta' | null {
  if (shortcut.meta) return 'meta'
  if (shortcut.alt) return isMacPlatform() ? 'meta' : 'alt'
  return null
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
  shortcutLabel: string
): { idle: string; active: string } {
  const modifier = getPortalShortcutModifierLabel()

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
