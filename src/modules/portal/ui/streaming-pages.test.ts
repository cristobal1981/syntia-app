import { Suspense, isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/src/modules/portal/application/get-client-home-data', () => ({ getClientHomeData: vi.fn() }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker: vi.fn(),
}))
vi.mock('@/src/modules/tramites/application/get-tramites-for-client', () => ({ getTramitesForClient: vi.fn() }))
vi.mock('@/src/modules/tramites/application/get-tramites-list-seen-state', () => ({
  getTramitesListSeenStateForUser: vi.fn(),
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({ resolveDirectoryActorId: vi.fn() }))
vi.mock('@/src/modules/obligaciones/application/get-obligaciones-for-client', () => ({
  getObligacionesForClient: vi.fn(),
}))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections: vi.fn(),
}))

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { ClientHome } from '@/src/modules/portal/ui/client-home'
import {
  ClientHomeGreeting,
  ClientHomeQuickLinksSection,
} from '@/src/modules/portal/ui/client-home-static'
import { TramitesPage } from '@/src/modules/tramites/ui/tramites-page'
import { ObligacionesPage } from '@/src/modules/obligaciones/ui/obligaciones-page'
import { ObligacionesPageHeader } from '@/src/modules/obligaciones/ui/obligaciones-page-header'
import { TramitesPageHeader } from '@/src/modules/tramites/ui/tramites-page-header'
import {
  ClientHomeDashboardSkeleton,
  ClientHomeLoading,
  ClientHomeQuickLinksSkeleton,
  ObligacionesBodySkeleton,
  ObligacionesSkeleton,
  TramitesBodySkeleton,
  TramitesSkeleton,
} from '@/src/modules/portal/ui/skeletons'

const user: PortalUser = { id: 'u1', email: 'a@b.c', name: 'Guillermo', role: 'client' }

function childrenOf(element: ReactElement): ReactElement[] {
  const { children } = element.props as { children?: ReactNode }
  return (Array.isArray(children) ? children : [children]).filter(isValidElement) as ReactElement[]
}

function suspenseFallbacks(element: ReactElement): ReactElement[] {
  return childrenOf(element)
    .filter((child) => child.type === Suspense)
    .map((child) => (child.props as { fallback: ReactElement }).fallback)
}

describe('el inicio pinta primero y deja los datos en streaming', () => {
  const worker: PortalUser = { ...user, role: 'worker' }

  it('ClientHome no espera nada (devuelve el árbol al instante, no una promesa)', () => {
    expect(ClientHome({ user })).not.toBeInstanceOf(Promise)
  })

  it('un cliente tiene el saludo y los accesos rápidos reales, sin Suspense; solo el resumen está en streaming', () => {
    const tree = ClientHome({ user }) as ReactElement
    expect(childrenOf(tree).map((child) => child.type)).toEqual([
      ClientHomeGreeting,
      Suspense,
      ClientHomeQuickLinksSection,
    ])
    expect(suspenseFallbacks(tree).map((fallback) => fallback.type)).toEqual([
      ClientHomeDashboardSkeleton,
    ])
  })

  it('el saludo lleva el nombre y la empresa del usuario', () => {
    const tree = ClientHome({ user: { ...user, companyName: 'Acme' } }) as ReactElement
    const greeting = childrenOf(tree).find((child) => child.type === ClientHomeGreeting)!
    expect(greeting.props).toEqual({ name: 'Guillermo', companyName: 'Acme' })
  })

  it('un colaborador espera a sus permisos: sus accesos rápidos van en un Suspense con esqueleto', () => {
    const tree = ClientHome({ user: worker }) as ReactElement
    expect(childrenOf(tree).map((child) => child.type)).toEqual([
      ClientHomeGreeting,
      Suspense,
      Suspense,
    ])
    expect(suspenseFallbacks(tree).map((fallback) => fallback.type)).toEqual([
      ClientHomeDashboardSkeleton,
      ClientHomeQuickLinksSkeleton,
    ])
  })

  it('la pantalla de carga de un cliente pinta lo mismo que la página, solo con el resumen en esqueleto (sin saltos)', () => {
    const loading = ClientHomeLoading({ user }) as ReactElement
    const wrapper = childrenOf(loading).find((child) => child.type === 'div')!
    expect(childrenOf(wrapper).map((child) => child.type)).toEqual([
      ClientHomeGreeting,
      ClientHomeDashboardSkeleton,
      ClientHomeQuickLinksSection,
    ])
  })

  it('la pantalla de carga de un colaborador no inventa accesos: esqueleto en su lugar', () => {
    const loading = ClientHomeLoading({ user: worker }) as ReactElement
    const wrapper = childrenOf(loading).find((child) => child.type === 'div')!
    expect(childrenOf(wrapper).map((child) => child.type)).toEqual([
      ClientHomeGreeting,
      ClientHomeDashboardSkeleton,
      ClientHomeQuickLinksSkeleton,
    ])
  })
})

describe('trámites pinta la cabecera y deja la lista en streaming', () => {
  it('TramitesPage no espera nada y lleva la cabecera fuera del Suspense', () => {
    const result = TramitesPage({ user })
    expect(result).not.toBeInstanceOf(Promise)
    const tree = result as ReactElement
    expect(childrenOf(tree).some((child) => child.type === TramitesPageHeader)).toBe(true)
  })

  it('la lista va dentro de un Suspense con el esqueleto del cuerpo', () => {
    const tree = TramitesPage({ user }) as ReactElement
    expect(suspenseFallbacks(tree).map((fallback) => fallback.type)).toEqual([TramitesBodySkeleton])
  })
})

describe('obligaciones pinta la cabecera y deja el contenido en streaming', () => {
  it('ObligacionesPage no espera nada y lleva la cabecera fuera del Suspense', () => {
    const result = ObligacionesPage({ user })
    expect(result).not.toBeInstanceOf(Promise)
    expect(childrenOf(result as ReactElement).some((child) => child.type === ObligacionesPageHeader)).toBe(true)
  })

  it('el contenido va dentro de un Suspense con el esqueleto del cuerpo', () => {
    const tree = ObligacionesPage({ user }) as ReactElement
    expect(suspenseFallbacks(tree).map((fallback) => fallback.type)).toEqual([ObligacionesBodySkeleton])
  })
})

describe('el esqueleto de pantalla completa coincide con la página real', () => {
  function skeletonChildTypes(skeleton: ReactElement): unknown[] {
    // Fragment[marcador, div[cabecera real, cuerpo en esqueleto]]
    const wrapper = childrenOf(skeleton).find((child) => child.type === 'div')!
    return childrenOf(wrapper).map((child) => child.type)
  }

  it('trámites: la misma cabecera real y el mismo cuerpo que el Suspense de la página', () => {
    expect(skeletonChildTypes(TramitesSkeleton() as ReactElement)).toEqual([
      TramitesPageHeader,
      TramitesBodySkeleton,
    ])
  })

  it('obligaciones: la misma cabecera real y el mismo cuerpo que el Suspense de la página', () => {
    expect(skeletonChildTypes(ObligacionesSkeleton() as ReactElement)).toEqual([
      ObligacionesPageHeader,
      ObligacionesBodySkeleton,
    ])
  })
})

describe('perfil: la cabecera real no depende de los datos', () => {
  it('el esqueleto de pantalla completa usa la cabecera real y el cuerpo en esqueleto, como el Suspense de la página', async () => {
    const { PerfilSkeleton, PerfilBodySkeleton } = await import('@/src/modules/portal/ui/skeletons')
    const { ProfilePageHeader } = await import('@/src/modules/profile/ui/profile-page-header')
    const tree = PerfilSkeleton() as ReactElement
    const wrapper = childrenOf(tree).find((child) => child.type === 'div')!
    expect(childrenOf(wrapper).map((child) => child.type)).toEqual([ProfilePageHeader, PerfilBodySkeleton])
  })
})
