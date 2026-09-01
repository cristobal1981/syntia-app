import { describe, expect, it } from 'vitest'

import { portal } from '@/content/portal'
import { getNavForRole } from '@/src/modules/portal/application/get-nav-for-role'

describe('getNavForRole', () => {
  it.each(['client', 'worker', 'admin', 'advisor'] as const)(
    'returns the exact item count from content for role=%s',
    (role) => {
      expect(getNavForRole(role)).toHaveLength(portal.nav[role].length)
    }
  )

  it('admin sees sections an advisor does NOT (Usuarios/Integraciones/Configuración)', () => {
    const adminHrefsAndLabels = getNavForRole('admin').map((item) => item.label)
    const advisorHrefsAndLabels = getNavForRole('advisor').map((item) => item.label)

    for (const adminOnlyLabel of ['Usuarios', 'Integraciones', 'Configuración']) {
      expect(adminHrefsAndLabels).toContain(adminOnlyLabel)
      expect(advisorHrefsAndLabels).not.toContain(adminOnlyLabel)
    }
  })

  it('admin has a nested "Usuarios" group with Asesores/Clientes children; advisor has no such group', () => {
    const usuarios = getNavForRole('admin').find((item) => item.label === 'Usuarios')

    expect(usuarios?.children?.map((c) => c.label)).toEqual(['Asesores', 'Clientes'])
  })

  it('advisor sees "Clientes" as a direct top-level link (not nested), unlike admin', () => {
    const clientesItem = getNavForRole('advisor').find((item) => item.label === 'Clientes')

    expect(clientesItem?.href).toBe('/clientes')
    expect(clientesItem?.children).toBeUndefined()
  })

  it('DEFENSIVE COPY: mutating the returned top-level items does NOT affect the underlying content module', () => {
    const first = getNavForRole('admin')
    first[0].label = 'MUTATED'

    const second = getNavForRole('admin')

    expect(second[0].label).not.toBe('MUTATED')
  })

  it('DEFENSIVE COPY: mutating a returned child item does NOT affect the underlying content module', () => {
    const first = getNavForRole('admin')
    const usuarios = first.find((item) => item.label === 'Usuarios')
    if (usuarios?.children?.[0]) {
      usuarios.children[0].label = 'MUTATED-CHILD'
    }

    const second = getNavForRole('admin')
    const usuariosAgain = second.find((item) => item.label === 'Usuarios')

    expect(usuariosAgain?.children?.[0]?.label).not.toBe('MUTATED-CHILD')
  })
})
