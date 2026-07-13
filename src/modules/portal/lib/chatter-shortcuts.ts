export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

export function formatModKeyLabel(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl'
}

export function formatChatterShortcut(parts: string[]): string {
  const mod = formatModKeyLabel()
  return parts
    .map((part) => (part === 'Mod' ? mod : part))
    .join('+')
    .replace('++', '+')
}

export function formatChatterShortcutHint(
  action: string,
  parts: string[]
): string {
  return `${action} (${formatChatterShortcut(parts)})`
}
