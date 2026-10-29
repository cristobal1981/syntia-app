import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/automatizaciones/application/get-nav-for-user', () => ({
  getNavForUser: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/src/modules/portal/ui/portal-shell', () => ({ PortalShell: () => null }))
vi.mock('@/src/modules/portal/ui/skeletons', () => ({ PortalPageSkeletonBody: () => null }))

import PortalLayout from '@/app/(portal)/layout'

type ShellFn = (props: { children: null }) => Promise<{ key: string | null }>

/** El layout solo monta un `Suspense` con la función que resuelve la sesión: se llama a mano. */
async function renderSessionShell() {
  const suspense = PortalLayout({ children: null }) as unknown as {
    props: { children: { type: ShellFn } }
  }
  return suspense.props.children.type({ children: null })
}

const sessionOf = (id: string) => ({
  user: { id, role: 'client', name: 'N', companyName: 'C' },
  viewingAs: false,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('layout del portal', () => {
  it('el marco lleva como key el id del usuario, para no heredar el estado del anterior', async () => {
    getSession.mockResolvedValueOnce(sessionOf('user-a'))
    const first = await renderSessionShell()
    getSession.mockResolvedValueOnce(sessionOf('user-b'))
    const second = await renderSessionShell()

    expect(first.key).toBe('user-a')
    expect(second.key).toBe('user-b')
  })
})
