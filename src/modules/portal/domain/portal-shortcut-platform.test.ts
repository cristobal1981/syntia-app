import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildPortalShortcutTooltipCopy,
  getPortalShortcutModifierLabel,
  getPortalShortcutModifierLabelFor,
  getPortalShortcutOverlayHint,
  isMacPlatform,
  isPortalShortcutModifierHeld,
  isPortalShortcutModifierKeyEvent,
  portalShortcutPhysicalCode,
  resolvePortalShortcutModifier,
} from '@/src/modules/portal/domain/portal-shortcut-platform'

function stubNavigator(userAgent: string, platform = userAgent) {
  vi.stubGlobal('navigator', { userAgent, platform })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isMacPlatform', () => {
  it('returns true for a Mac userAgent', () => {
    stubNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel')
    expect(isMacPlatform()).toBe(true)
  })

  it('returns true for an iPhone/iPad userAgent even if platform does not say Mac', () => {
    stubNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone')
    expect(isMacPlatform()).toBe(true)
  })

  it('returns false for a Windows userAgent/platform', () => {
    stubNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32')
    expect(isMacPlatform()).toBe(false)
  })

  it('returns false for a Linux userAgent/platform', () => {
    stubNavigator('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64')
    expect(isMacPlatform()).toBe(false)
  })
})

describe('resolvePortalShortcutModifier', () => {
  it('meta:true wins regardless of alt', () => {
    expect(resolvePortalShortcutModifier({ meta: true, alt: true })).toBe('meta')
  })

  it('alt without keepAltOnMac resolves to meta on Mac', () => {
    stubNavigator('Macintosh')
    expect(resolvePortalShortcutModifier({ alt: true })).toBe('meta')
  })

  it('alt without keepAltOnMac resolves to alt on non-Mac', () => {
    stubNavigator('Windows')
    expect(resolvePortalShortcutModifier({ alt: true })).toBe('alt')
  })

  it('alt WITH keepAltOnMac stays alt even on Mac', () => {
    stubNavigator('Macintosh')
    expect(resolvePortalShortcutModifier({ alt: true, keepAltOnMac: true })).toBe('alt')
  })

  it('returns null when neither alt nor meta is set', () => {
    expect(resolvePortalShortcutModifier({})).toBeNull()
  })
})

describe('getPortalShortcutModifierLabelFor', () => {
  it('returns ⌘ when the resolved modifier is meta', () => {
    expect(getPortalShortcutModifierLabelFor({ meta: true })).toBe('⌘')
  })

  it('returns ⌥ for alt+keepAltOnMac on Mac', () => {
    stubNavigator('Macintosh')
    expect(getPortalShortcutModifierLabelFor({ alt: true, keepAltOnMac: true })).toBe('⌥')
  })

  it('returns "Alt" for alt+keepAltOnMac on non-Mac', () => {
    stubNavigator('Windows')
    expect(getPortalShortcutModifierLabelFor({ alt: true, keepAltOnMac: true })).toBe('Alt')
  })

  it('returns empty string when there is no modifier', () => {
    expect(getPortalShortcutModifierLabelFor({})).toBe('')
  })
})

describe('portalShortcutPhysicalCode', () => {
  it('maps a single letter to its KeyX physical code, uppercased', () => {
    expect(portalShortcutPhysicalCode('r')).toBe('KeyR')
    expect(portalShortcutPhysicalCode('N')).toBe('KeyN')
  })

  it('returns null for a non-letter or multi-character key', () => {
    expect(portalShortcutPhysicalCode('1')).toBeNull()
    expect(portalShortcutPhysicalCode('rr')).toBeNull()
    expect(portalShortcutPhysicalCode('')).toBeNull()
  })
})

describe('isPortalShortcutModifierHeld', () => {
  it('on Mac, true if metaKey OR altKey is held', () => {
    stubNavigator('Macintosh')
    expect(isPortalShortcutModifierHeld({ metaKey: true, altKey: false } as KeyboardEvent)).toBe(
      true
    )
    expect(isPortalShortcutModifierHeld({ metaKey: false, altKey: true } as KeyboardEvent)).toBe(
      true
    )
    expect(isPortalShortcutModifierHeld({ metaKey: false, altKey: false } as KeyboardEvent)).toBe(
      false
    )
  })

  it('on non-Mac, only altKey counts (metaKey alone is NOT a held modifier)', () => {
    stubNavigator('Windows')
    expect(isPortalShortcutModifierHeld({ metaKey: true, altKey: false } as KeyboardEvent)).toBe(
      false
    )
    expect(isPortalShortcutModifierHeld({ metaKey: false, altKey: true } as KeyboardEvent)).toBe(
      true
    )
  })
})

describe('isPortalShortcutModifierKeyEvent', () => {
  it('"Alt"/"AltGraph" key always counts, on any platform', () => {
    stubNavigator('Windows')
    expect(isPortalShortcutModifierKeyEvent({ key: 'Alt' } as KeyboardEvent)).toBe(true)
    expect(isPortalShortcutModifierKeyEvent({ key: 'AltGraph' } as KeyboardEvent)).toBe(true)
  })

  it('"Meta"/"OS" key only counts on Mac', () => {
    stubNavigator('Macintosh')
    expect(isPortalShortcutModifierKeyEvent({ key: 'Meta' } as KeyboardEvent)).toBe(true)
    expect(isPortalShortcutModifierKeyEvent({ key: 'OS' } as KeyboardEvent)).toBe(true)

    stubNavigator('Windows')
    expect(isPortalShortcutModifierKeyEvent({ key: 'Meta' } as KeyboardEvent)).toBe(false)
  })

  it('any other key is not a modifier key event', () => {
    expect(isPortalShortcutModifierKeyEvent({ key: 'r' } as KeyboardEvent)).toBe(false)
  })
})

describe('getPortalShortcutModifierLabel', () => {
  it('⌘ on Mac, "Alt" otherwise', () => {
    stubNavigator('Macintosh')
    expect(getPortalShortcutModifierLabel()).toBe('⌘')

    stubNavigator('Windows')
    expect(getPortalShortcutModifierLabel()).toBe('Alt')
  })
})

describe('buildPortalShortcutTooltipCopy', () => {
  const copy = {
    buttonHintIdle: 'Pulsa {modifier} para {action}',
    buttonHintActive: '{shortcut} para {action}',
  }

  it('interpolates action/modifier into the idle copy and action/shortcut into the active copy', () => {
    const result = buildPortalShortcutTooltipCopy(copy, 'refrescar', 'R', '⌘')

    expect(result.idle).toBe('Pulsa ⌘ para refrescar')
    expect(result.active).toBe('R para refrescar')
  })

  it('defaults the modifier to getPortalShortcutModifierLabel() when not given', () => {
    stubNavigator('Macintosh')
    const result = buildPortalShortcutTooltipCopy(copy, 'refrescar', 'R')

    expect(result.idle).toBe('Pulsa ⌘ para refrescar')
  })
})

describe('getPortalShortcutOverlayHint', () => {
  it('includes the resolved modifier label', () => {
    stubNavigator('Macintosh')
    expect(getPortalShortcutOverlayHint()).toBe(
      'Mantén ⌘ · Pulsa la tecla resaltada en cada botón'
    )

    stubNavigator('Windows')
    expect(getPortalShortcutOverlayHint()).toBe(
      'Mantén Alt · Pulsa la tecla resaltada en cada botón'
    )
  })
})
