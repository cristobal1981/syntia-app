import { describe, expect, it } from 'vitest'

import { BOTTOM_BAR_HREFS, getBottomBarSplit } from '@/src/modules/portal/application/get-bottom-bar-split'
import { getNavForRole } from '@/src/modules/portal/application/get-nav-for-role'

describe('getBottomBarSplit', () => {
  it.each(['client', 'worker', 'admin', 'advisor'] as const)(
    'bottomBarItems for role=%s matches BOTTOM_BAR_HREFS exactly, in order',
    (role) => {
      const navItems = getNavForRole(role)
      const { bottomBarItems } = getBottomBarSplit(navItems, role)

      expect(bottomBarItems.map((item) => item.href)).toEqual(BOTTOM_BAR_HREFS[role])
    }
  )

  it.each(['client', 'worker', 'admin', 'advisor'] as const)(
    'bottomBarItems + moreNavItems partition navItems exactly for role=%s (no loss, no duplication)',
    (role) => {
      const navItems = getNavForRole(role)
      const { bottomBarItems, moreNavItems } = getBottomBarSplit(navItems, role)

      expect(bottomBarItems.length + moreNavItems.length).toBe(navItems.length)
      const combinedHrefs = new Set([
        ...bottomBarItems.map((item) => item.href),
        ...moreNavItems.map((item) => item.href),
      ])
      expect(combinedHrefs.size).toBe(navItems.length)
    }
  )

  it('admin and advisor get DIFFERENT bottombar hrefs (role-specific, not shared)', () => {
    expect(BOTTOM_BAR_HREFS.admin).not.toEqual(BOTTOM_BAR_HREFS.advisor)
  })

  it('a navItem whose href is not in BOTTOM_BAR_HREFS for that role lands in moreNavItems', () => {
    const navItems = getNavForRole('admin')
    const { moreNavItems } = getBottomBarSplit(navItems, 'admin')

    const usuarios = moreNavItems.find((item) => item.label === 'Usuarios')
    expect(usuarios).toBeDefined()
  })

  it('a BOTTOM_BAR_HREFS href missing from navItems (e.g. feature-gated out) is silently skipped, not inserted as undefined', () => {
    const navItems = getNavForRole('client').filter((item) => item.href !== '/firmas')
    const { bottomBarItems } = getBottomBarSplit(navItems, 'client')

    expect(bottomBarItems.some((item) => item.href === '/firmas')).toBe(false)
    expect(bottomBarItems.every((item) => item != null)).toBe(true)
  })

  it('an item with no href (a nested group like "Usuarios") never matches a bottombar slot', () => {
    const navItems = getNavForRole('admin')
    const { bottomBarItems } = getBottomBarSplit(navItems, 'admin')

    expect(bottomBarItems.some((item) => item.href == null)).toBe(false)
  })
})
