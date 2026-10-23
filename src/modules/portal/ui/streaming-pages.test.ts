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
import { TramitesPage } from '@/src/modules/tramites/ui/tramites-page'
import { ObligacionesPage } from '@/src/modules/obligaciones/ui/obligaciones-page'
import { ObligacionesPageHeader } from '@/src/modules/obligaciones/ui/obligaciones-page-header'
import { TramitesPageHeader } from '@/src/modules/tramites/ui/tramites-page-header'
import {
  ClientHomeDashboardSkeleton,
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
  it('ClientHome no espera nada (devuelve el árbol al instante, no una promesa)', () => {
    const result = ClientHome({ user })
    expect(result).not.toBeInstanceOf(Promise)
  })

  it('el saludo va fuera de cualquier Suspense, con el nombre del usuario', () => {
    const tree = ClientHome({ user }) as ReactElement
    const header = childrenOf(tree).find((child) => child.type === 'header')
    expect(header).toBeDefined()
    expect(JSON.stringify(header!.props)).toContain('Guillermo')
  })

  it('el resumen/novedades y los accesos rápidos tienen cada uno su Suspense y su esqueleto', () => {
    const tree = ClientHome({ user }) as ReactElement
    const fallbacks = suspenseFallbacks(tree)
    expect(fallbacks.map((fallback) => fallback.type)).toEqual([
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
