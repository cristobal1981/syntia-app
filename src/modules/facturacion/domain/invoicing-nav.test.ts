import { describe, expect, it } from 'vitest'

import { buildInvoicingNavItems } from '@/src/modules/facturacion/domain/invoicing-nav'
import { SECTIONS, sectionHref } from '@/src/modules/facturacion/domain/sections'

describe('buildInvoicingNavItems', () => {
  const [billing, ...rest] = buildInvoicingNavItems()

  it('es un único grupo desplegable «Facturación», sin enlace propio', () => {
    expect(rest).toHaveLength(0)
    expect(billing.label).toBe('Facturación')
    expect(billing.href).toBeUndefined()
  })

  it('lista las secciones en orden', () => {
    expect(billing.children?.map((child) => child.label)).toEqual([
      'Panel',
      'Facturas',
      'Clientes',
      'Productos y servicios',
      'Datos fiscales',
    ])
  })

  it('no se pierde ni se repite ninguna sección', () => {
    const hrefs = billing.children?.map((child) => child.href) ?? []
    expect([...hrefs].sort()).toEqual(SECTIONS.map((section) => sectionHref(section)).sort())
  })

  it('ninguna ruta de hijo es prefijo de otra: el sidebar marca una sola activa', () => {
    const hrefs = billing.children?.map((child) => child.href ?? '') ?? []
    for (const a of hrefs) {
      for (const b of hrefs) {
        if (a !== b) expect(b.startsWith(`${a}/`), `${a} / ${b}`).toBe(false)
      }
    }
  })

  it('cada hijo lleva icono', () => {
    for (const child of billing.children ?? []) expect(child.icon).toBeTruthy()
  })
})
