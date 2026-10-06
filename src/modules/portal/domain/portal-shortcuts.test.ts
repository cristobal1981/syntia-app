import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatPortalShortcutLabel,
  getPortalShortcutActionKeys,
  getPortalShortcutKeys,
  isPortalShortcutBlockedTarget,
  matchesPortalShortcut,
  PORTAL_REFRESH_SHORTCUT,
  type PortalShortcutDefinition,
} from '@/src/modules/portal/domain/portal-shortcuts'

function stubNavigator(userAgent: string, platform = userAgent) {
  vi.stubGlobal('navigator', { userAgent, platform })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function keyEvent(
  overrides: Partial<{
    key: string
    code: string
    ctrlKey: boolean
    shiftKey: boolean
    altKey: boolean
    metaKey: boolean
  }>
): KeyboardEvent {
  return {
    key: '',
    code: '',
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...overrides,
  } as KeyboardEvent
}

describe('getPortalShortcutKeys / formatPortalShortcutLabel', () => {
  it('refresh shortcut (alt+keepAltOnMac) shows "Alt" on non-Mac', () => {
    stubNavigator('Windows')
    expect(getPortalShortcutKeys(PORTAL_REFRESH_SHORTCUT)).toEqual(['Alt', 'R'])
    expect(formatPortalShortcutLabel(PORTAL_REFRESH_SHORTCUT)).toBe('Alt+R')
  })

  it('refresh shortcut (alt+keepAltOnMac) shows "⌥" on Mac — keepAltOnMac keeps it physical, not ⌘', () => {
    stubNavigator('Macintosh')
    expect(getPortalShortcutKeys(PORTAL_REFRESH_SHORTCUT)).toEqual(['⌥', 'R'])
  })

  it('a plain meta shortcut shows ⌘ on any platform', () => {
    const shortcut: PortalShortcutDefinition = { id: 'x', meta: true, key: 'k' }
    stubNavigator('Windows')
    expect(getPortalShortcutKeys(shortcut)).toEqual(['⌘', 'K'])
  })

  it('includes Ctrl/Shift when set, in Ctrl, Shift, modifier-key order', () => {
    const shortcut: PortalShortcutDefinition = {
      id: 'x',
      meta: true,
      ctrl: true,
      shift: true,
      key: 'k',
    }
    expect(getPortalShortcutKeys(shortcut)).toEqual(['⌘', 'Ctrl', 'Shift', 'K'])
  })
})

describe('getPortalShortcutActionKeys', () => {
  it('returns only the uppercased action key, no modifiers', () => {
    expect(getPortalShortcutActionKeys(PORTAL_REFRESH_SHORTCUT)).toEqual(['R'])
  })
})

describe('matchesPortalShortcut', () => {
  it('matches on physical code for a letter key regardless of layout-shifted event.key', () => {
    stubNavigator('Windows')
    const event = keyEvent({ altKey: true, code: 'KeyR', key: 'π' })
    expect(matchesPortalShortcut(event, PORTAL_REFRESH_SHORTCUT)).toBe(true)
  })

  it('falls back to event.key match (case-insensitive) when code does not match', () => {
    stubNavigator('Windows')
    const event = keyEvent({ altKey: true, code: 'SomethingElse', key: 'R' })
    expect(matchesPortalShortcut(event, PORTAL_REFRESH_SHORTCUT)).toBe(true)
  })

  it('does NOT match when the modifier is missing', () => {
    stubNavigator('Windows')
    const event = keyEvent({ altKey: false, code: 'KeyR', key: 'r' })
    expect(matchesPortalShortcut(event, PORTAL_REFRESH_SHORTCUT)).toBe(false)
  })

  it('on Mac, alt+keepAltOnMac requires altKey and rejects metaKey (does not accept ⌘R for an Option shortcut)', () => {
    stubNavigator('Macintosh')
    const withAlt = keyEvent({ altKey: true, code: 'KeyR', key: 'r' })
    expect(matchesPortalShortcut(withAlt, PORTAL_REFRESH_SHORTCUT)).toBe(true)

    const withMetaInstead = keyEvent({ metaKey: true, altKey: false, code: 'KeyR', key: 'r' })
    expect(matchesPortalShortcut(withMetaInstead, PORTAL_REFRESH_SHORTCUT)).toBe(false)

    // Both held at once (e.g. mid-chord on a real Cmd+Option shortcut) must
    // NOT match this Option-only shortcut — metaKey being held is a hard
    // reject, not just "altKey is enough".
    const withBoth = keyEvent({ metaKey: true, altKey: true, code: 'KeyR', key: 'r' })
    expect(matchesPortalShortcut(withBoth, PORTAL_REFRESH_SHORTCUT)).toBe(false)
  })

  it('plain alt shortcut (no keepAltOnMac) resolves to meta on Mac: accepts metaKey OR altKey, needs metaKey off on non-Mac', () => {
    const shortcut: PortalShortcutDefinition = { id: 'x', alt: true, key: 'n' }

    stubNavigator('Macintosh')
    expect(matchesPortalShortcut(keyEvent({ metaKey: true, key: 'n' }), shortcut)).toBe(true)
    expect(matchesPortalShortcut(keyEvent({ altKey: true, key: 'n' }), shortcut)).toBe(true)

    stubNavigator('Windows')
    expect(matchesPortalShortcut(keyEvent({ metaKey: true, key: 'n' }), shortcut)).toBe(false)
    expect(matchesPortalShortcut(keyEvent({ altKey: true, key: 'n' }), shortcut)).toBe(true)
  })

  it('rejects when ctrl/shift expectation does not match the event', () => {
    const shortcut: PortalShortcutDefinition = { id: 'x', meta: true, ctrl: true, key: 'k' }
    stubNavigator('Windows')

    expect(matchesPortalShortcut(keyEvent({ metaKey: true, ctrlKey: false, key: 'k' }), shortcut)).toBe(
      false
    )
    expect(matchesPortalShortcut(keyEvent({ metaKey: true, ctrlKey: true, key: 'k' }), shortcut)).toBe(
      true
    )
  })

  it('an explicit meta:true shortcut on non-Mac requires metaKey specifically — altKey alone does not match', () => {
    const shortcut: PortalShortcutDefinition = { id: 'x', meta: true, key: 'k' }
    stubNavigator('Windows')

    expect(matchesPortalShortcut(keyEvent({ metaKey: true, key: 'k' }), shortcut)).toBe(true)
    expect(matchesPortalShortcut(keyEvent({ altKey: true, key: 'k' }), shortcut)).toBe(false)
  })

  it('a bare shortcut with no alt/meta falls through to raw meta/alt flag checks on the event', () => {
    const shortcut: PortalShortcutDefinition = { id: 'x', key: 'k' }
    stubNavigator('Windows')

    expect(matchesPortalShortcut(keyEvent({ key: 'k' }), shortcut)).toBe(true)
    expect(matchesPortalShortcut(keyEvent({ key: 'k', metaKey: true }), shortcut)).toBe(false)
    expect(matchesPortalShortcut(keyEvent({ key: 'k', altKey: true }), shortcut)).toBe(false)
  })
})

describe('isPortalShortcutBlockedTarget', () => {
  class FakeHTMLElement {
    tagName: string
    isContentEditable: boolean
    constructor(tagName: string, isContentEditable = false) {
      this.tagName = tagName
      this.isContentEditable = isContentEditable
    }
  }

  // Node's vitest environment has no DOM — `instanceof HTMLElement` would
  // throw ReferenceError without this stub, since HTMLElement does not exist.
  beforeEach(() => {
    vi.stubGlobal('HTMLElement', FakeHTMLElement)
  })

  it('returns false for null target', () => {
    expect(isPortalShortcutBlockedTarget(null)).toBe(false)
  })

  it('returns false for a non-HTMLElement target (e.g. document)', () => {
    expect(isPortalShortcutBlockedTarget({} as EventTarget)).toBe(false)
  })

  it.each(['input', 'textarea', 'select'])('blocks a plain %s element', (tag) => {
    const target = new FakeHTMLElement(tag.toUpperCase()) as unknown as EventTarget
    expect(isPortalShortcutBlockedTarget(target)).toBe(true)
  })

  it('does not block a plain div', () => {
    const target = new FakeHTMLElement('DIV') as unknown as EventTarget
    expect(isPortalShortcutBlockedTarget(target)).toBe(false)
  })

  it('blocks a contentEditable element regardless of tag', () => {
    vi.stubGlobal('HTMLElement', FakeHTMLElement)
    const target = new FakeHTMLElement('DIV', true) as unknown as EventTarget
    expect(isPortalShortcutBlockedTarget(target)).toBe(true)
  })
})
