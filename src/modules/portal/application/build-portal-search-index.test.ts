import { describe, expect, it } from 'vitest'

import type { NavItem } from '@/src/modules/portal/domain/types'
import {
  buildPortalSearchActions,
  buildPortalSearchIndex,
} from '@/src/modules/portal/application/build-portal-search-index'

describe('buildPortalSearchIndex', () => {
  it('includes a top-level nav item with href as its own entry (no group label)', () => {
    const navItems: NavItem[] = [
      { label: 'Inicio', href: '/inicio', implemented: true, icon: 'home' },
    ]

    const result = buildPortalSearchIndex('client', navItems)

    expect(result).toEqual([
      {
        id: 'nav:/inicio',
        kind: 'page',
        label: 'Inicio',
        description: undefined,
        href: '/inicio',
        icon: 'home',
        keywords: ['Inicio'],
      },
      // + client extras (guías)
      expect.objectContaining({ href: '/guias' }),
      expect.objectContaining({ href: '/guias/modelos-aeat' }),
    ])
  })

  it('excludes a top-level nav item with no href', () => {
    const navItems: NavItem[] = [
      { label: 'Próximamente', implemented: false, icon: 'settings' },
    ]

    const result = buildPortalSearchIndex('admin', navItems)

    expect(result).toEqual([])
  })

  it('flattens children using the parent label as group label, and excludes the parent entry itself even when the parent also has an href', () => {
    const navItems: NavItem[] = [
      {
        label: 'Usuarios',
        href: '/usuarios',
        implemented: true,
        icon: 'team',
        children: [
          { label: 'Asesores', href: '/usuarios/asesores', implemented: true, icon: 'team' },
          { label: 'Clientes', href: '/usuarios/clientes', implemented: true, icon: 'clients' },
        ],
      },
    ]

    const result = buildPortalSearchIndex('admin', navItems)

    expect(result).toEqual([
      {
        id: 'nav:/usuarios/asesores',
        kind: 'page',
        label: 'Asesores',
        description: 'Usuarios · Asesores',
        href: '/usuarios/asesores',
        icon: 'team',
        keywords: ['Usuarios', 'Asesores'],
      },
      {
        id: 'nav:/usuarios/clientes',
        kind: 'page',
        label: 'Clientes',
        description: 'Usuarios · Clientes',
        href: '/usuarios/clientes',
        icon: 'clients',
        keywords: ['Usuarios', 'Clientes'],
      },
    ])
  })

  it('excludes a child with no href from the flattened group', () => {
    const navItems: NavItem[] = [
      {
        label: 'Grupo',
        implemented: true,
        icon: 'team',
        children: [
          { label: 'Sin link', implemented: false, icon: 'team' },
          { label: 'Con link', href: '/con-link', implemented: true, icon: 'team' },
        ],
      },
    ]

    const result = buildPortalSearchIndex('admin', navItems)

    expect(result).toEqual([
      expect.objectContaining({ href: '/con-link', label: 'Con link' }),
    ])
  })

  it('includes all role extras when allowedHrefs is not provided', () => {
    const result = buildPortalSearchIndex('client', [])

    expect(result.map((item) => item.href)).toEqual(['/guias', '/guias/modelos-aeat'])
  })

  it('filters extras down to only the hrefs present in allowedHrefs', () => {
    const result = buildPortalSearchIndex('client', [], new Set(['/guias']))

    expect(result.map((item) => item.href)).toEqual(['/guias'])
  })

  it('does NOT filter nav items by allowedHrefs (only extras are scoped by it) — nav is assumed pre-filtered by the caller', () => {
    const navItems: NavItem[] = [
      { label: 'Fuera de alcance', href: '/fuera-de-alcance', implemented: true, icon: 'home' },
    ]

    const result = buildPortalSearchIndex('client', navItems, new Set(['/nada-que-ver']))

    expect(result.map((item) => item.href)).toContain('/fuera-de-alcance')
  })

  it('dedupes by href, with the nav item winning over an extra sharing the same href', () => {
    const navItems: NavItem[] = [
      { label: 'Guías (nav)', href: '/guias', implemented: true, icon: 'guides' },
    ]

    const result = buildPortalSearchIndex('client', navItems)
    const guiasEntries = result.filter((item) => item.href === '/guias')

    expect(guiasEntries).toHaveLength(1)
    expect(guiasEntries[0]?.id).toBe('nav:/guias')
  })

  it('returns an empty list for a role with no extras and no nav items', () => {
    expect(buildPortalSearchIndex('advisor', [])).toEqual([])
  })
})

describe('buildPortalSearchActions', () => {
  it('returns no actions when the query is empty or whitespace-only', () => {
    expect(buildPortalSearchActions('client', '')).toEqual([])
    expect(buildPortalSearchActions('client', '   ')).toEqual([])
  })

  it('returns the clientes action for admin, pointing at /equipo/clientes', () => {
    const result = buildPortalSearchActions('admin', 'factura')

    expect(result).toEqual([
      {
        id: 'action:clientes',
        kind: 'action',
        label: 'Buscar clientes: «factura»',
        href: '/equipo/clientes?q=factura',
        icon: 'clients',
        keywords: [],
      },
    ])
  })

  it('returns the clientes action for advisor, pointing at /clientes', () => {
    const result = buildPortalSearchActions('advisor', 'factura')

    expect(result).toEqual([
      {
        id: 'action:clientes',
        kind: 'action',
        label: 'Buscar clientes: «factura»',
        href: '/clientes?q=factura',
        icon: 'clients',
        keywords: [],
      },
    ])
  })

  it('omits the clientes action for admin/advisor when /equipo/clientes or /clientes is not in allowedHrefs', () => {
    expect(buildPortalSearchActions('admin', 'factura', new Set())).toEqual([])
    expect(buildPortalSearchActions('advisor', 'factura', new Set())).toEqual([])
  })

  it('returns tramites, obligaciones and documentos actions for a client with no allowedHrefs restriction', () => {
    const result = buildPortalSearchActions('client', 'factura 303')

    expect(result).toEqual([
      {
        id: 'action:tramites',
        kind: 'action',
        label: 'Buscar trámites: «factura 303»',
        href: '/tramites?q=factura%20303',
        icon: 'procedures',
        keywords: [],
      },
      {
        id: 'action:obligaciones',
        kind: 'action',
        label: 'Buscar obligaciones: «factura 303»',
        href: '/obligaciones?q=factura%20303',
        icon: 'obligations',
        keywords: [],
      },
      {
        id: 'action:documentos',
        kind: 'action',
        label: 'Buscar documentos: «factura 303»',
        href: '/documentos?q=factura%20303',
        icon: 'documents',
        keywords: [],
      },
    ])
  })

  it('trims the query before using it for the label and href, for a worker too', () => {
    const result = buildPortalSearchActions('worker', '  303  ')

    expect(result[0]?.label).toBe('Buscar trámites: «303»')
    expect(result[0]?.href).toBe('/tramites?q=303')
  })

  it('omits the tramites action when /tramites is not in allowedHrefs', () => {
    const result = buildPortalSearchActions('client', 'factura', new Set(['/obligaciones']))

    expect(result.map((item) => item.id)).toEqual(['action:obligaciones'])
  })

  it('omits the obligaciones action when /obligaciones is not in allowedHrefs', () => {
    const result = buildPortalSearchActions('worker', 'factura', new Set(['/tramites']))

    expect(result.map((item) => item.id)).toEqual(['action:tramites'])
  })

  it('omits tramites/obligaciones but keeps documentos when only /documentos is allowed', () => {
    const result = buildPortalSearchActions('client', 'factura', new Set(['/documentos']))

    expect(result.map((item) => item.id)).toEqual(['action:documentos'])
  })

  it('omits all three actions when allowedHrefs grants none of them', () => {
    const result = buildPortalSearchActions('client', 'factura', new Set(['/firmas']))

    expect(result).toEqual([])
  })
})
