import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { NavItem } from '@/src/modules/portal/domain/types'
import {
  canAccessAutomatizacionesPage,
  getNavForUser,
  shouldShowAutomatizacionesNav,
} from '@/src/modules/automatizaciones/application/get-nav-for-user'

const {
  getNavForRole,
  countVisibleAutomationsForAdvisor,
  resolveDirectoryActorId,
  getAllowedSectionsForWorker,
} = vi.hoisted(() => ({
  getNavForRole: vi.fn(),
  countVisibleAutomationsForAdvisor: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
}))

vi.mock('@/src/modules/portal/application/get-nav-for-role', () => ({ getNavForRole }))
vi.mock('@/src/modules/automatizaciones/infrastructure/automation-repository.supabase', () => ({
  countVisibleAutomationsForAdvisor,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))

function user(overrides: Partial<PortalUser> = {}): PortalUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role: 'advisor',
    ...overrides,
  }
}

const BASE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', implemented: true, icon: 'home' },
  { label: 'Automatizaciones', href: '/automatizaciones', implemented: true, icon: 'automations' },
  { label: 'Trámites', href: '/tramites', implemented: true, icon: 'procedures' },
  {
    label: 'Config',
    implemented: true,
    icon: 'settings',
    children: [
      { label: 'Automatizaciones (sub)', href: '/automatizaciones', implemented: true, icon: 'automations' },
      { label: 'Otro', href: '/otro', implemented: true, icon: 'settings' },
    ],
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  getNavForRole.mockReturnValue(BASE_NAV.map((item) => ({ ...item })))
})

describe('shouldShowAutomatizacionesNav', () => {
  it('is false for client/worker roles, without any lookups', async () => {
    await expect(shouldShowAutomatizacionesNav(user({ role: 'client' }))).resolves.toBe(
      false
    )
    await expect(shouldShowAutomatizacionesNav(user({ role: 'worker' }))).resolves.toBe(
      false
    )
    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
  })

  it('is unconditionally true for admin — never checks visible-automation count', async () => {
    await expect(shouldShowAutomatizacionesNav(user({ role: 'admin' }))).resolves.toBe(
      true
    )
    expect(countVisibleAutomationsForAdvisor).not.toHaveBeenCalled()
  })

  it('for an advisor, is true only when they have at least one visible automation', async () => {
    resolveDirectoryActorId.mockResolvedValue('actor-1')
    countVisibleAutomationsForAdvisor.mockResolvedValue(1)

    await expect(shouldShowAutomatizacionesNav(user({ role: 'advisor' }))).resolves.toBe(
      true
    )
    expect(countVisibleAutomationsForAdvisor).toHaveBeenCalledWith('actor-1')
  })

  it('for an advisor with ZERO visible automations, is false', async () => {
    resolveDirectoryActorId.mockResolvedValue('actor-1')
    countVisibleAutomationsForAdvisor.mockResolvedValue(0)

    await expect(shouldShowAutomatizacionesNav(user({ role: 'advisor' }))).resolves.toBe(
      false
    )
  })

  it('FAILS SAFE to false (not throw) when the lookup errors', async () => {
    resolveDirectoryActorId.mockRejectedValue(new Error('db down'))

    await expect(shouldShowAutomatizacionesNav(user({ role: 'advisor' }))).resolves.toBe(
      false
    )
  })
})

describe('getNavForUser', () => {
  it('worker: delegates to the section-filtered nav and never even checks automatizaciones visibility', async () => {
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    const items = await getNavForUser(user({ role: 'worker' }))

    expect(items.map((i) => i.href)).toEqual(['/dashboard', '/tramites'])
    expect(countVisibleAutomationsForAdvisor).not.toHaveBeenCalled()
  })

  it('worker: keeps /dashboard even if not in the allowed-sections set', async () => {
    getAllowedSectionsForWorker.mockResolvedValue(new Set())

    const items = await getNavForUser(user({ role: 'worker' }))

    expect(items.map((i) => i.href)).toContain('/dashboard')
  })

  it('worker: drops an item whose href is not a recognized worker-section href, even if oddly present', async () => {
    getNavForRole.mockReturnValue([
      { label: 'X', href: '/no-es-una-seccion-de-worker', implemented: true, icon: 'settings' },
    ])
    getAllowedSectionsForWorker.mockResolvedValue(
      new Set(['/no-es-una-seccion-de-worker'] as never[])
    )

    const items = await getNavForUser(user({ role: 'worker' }))

    expect(items).toEqual([])
  })

  it('admin/advisor with visibility: returns the FULL nav unchanged, /automatizaciones included', async () => {
    const result = await getNavForUser(user({ role: 'admin' }))

    expect(result.some((i) => i.href === '/automatizaciones')).toBe(true)
  })

  it('advisor WITHOUT visibility: strips /automatizaciones at both the top level AND inside children', async () => {
    resolveDirectoryActorId.mockResolvedValue('actor-1')
    countVisibleAutomationsForAdvisor.mockResolvedValue(0)

    const result = await getNavForUser(user({ role: 'advisor' }))

    expect(result.some((i) => i.href === '/automatizaciones')).toBe(false)
    const configItem = result.find((i) => i.label === 'Config')
    expect(configItem?.children?.some((c) => c.href === '/automatizaciones')).toBe(false)
    // Sibling children are preserved — only the automatizaciones entry is stripped.
    expect(configItem?.children?.some((c) => c.href === '/otro')).toBe(true)
  })
})

describe('canAccessAutomatizacionesPage', () => {
  it('is false for client/worker roles', async () => {
    await expect(
      canAccessAutomatizacionesPage(user({ role: 'client' }))
    ).resolves.toBe(false)
    await expect(
      canAccessAutomatizacionesPage(user({ role: 'worker' }))
    ).resolves.toBe(false)
  })

  it('is unconditionally true for admin', async () => {
    await expect(canAccessAutomatizacionesPage(user({ role: 'admin' }))).resolves.toBe(
      true
    )
  })

  it('for advisor, mirrors shouldShowAutomatizacionesNav (visible-automation count)', async () => {
    resolveDirectoryActorId.mockResolvedValue('actor-1')
    countVisibleAutomationsForAdvisor.mockResolvedValue(0)

    await expect(
      canAccessAutomatizacionesPage(user({ role: 'advisor' }))
    ).resolves.toBe(false)
  })
})
