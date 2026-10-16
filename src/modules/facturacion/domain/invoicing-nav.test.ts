import { describe, expect, it } from 'vitest'

import { buildInvoicingNavItems } from '@/src/modules/facturacion/domain/invoicing-nav'
import { SECTIONS, sectionHref } from '@/src/modules/facturacion/domain/sections'

describe('buildInvoicingNavItems', () => {
  const [billing, accounting] = buildInvoicingNavItems()

  it('son dos grupos desplegables, sin enlace propio', () => {
    expect([billing.label, accounting.label]).toEqual(['Facturación', 'Contabilidad'])
    expect(billing.href).toBeUndefined()
    expect(accounting.href).toBeUndefined()
  })

  it('reparte las secciones en su grupo, en orden', () => {
    expect(billing.children?.map((child) => child.label)).toEqual([
      'Panel',
      'Facturas',
      'Cobros y pagos',
      'Clientes y proveedores',
      'Datos fiscales',
    ])
    expect(accounting.children?.map((child) => child.href)).toEqual([
      '/facturacion/libro-recibidas',
      '/facturacion/libro-emitidas',
      '/facturacion/ingresos-y-gastos',
      '/facturacion/libro-diario',
      '/facturacion/libro-mayor',
      '/facturacion/perdidas-y-ganancias',
      '/facturacion/balance',
      '/facturacion/resumen-fiscal',
    ])
  })

  it('no se pierde ni se repite ninguna sección', () => {
    const hrefs = [billing, accounting].flatMap((group) => group.children?.map((child) => child.href) ?? [])
    expect([...hrefs].sort()).toEqual(SECTIONS.map((section) => sectionHref(section)).sort())
  })

  it('ninguna ruta de hijo es prefijo de otra: el sidebar marca una sola activa', () => {
    const hrefs = [billing, accounting].flatMap((group) => group.children?.map((child) => child.href ?? '') ?? [])
    for (const a of hrefs) {
      for (const b of hrefs) {
        if (a !== b) expect(b.startsWith(`${a}/`), `${a} / ${b}`).toBe(false)
      }
    }
  })

  it('cada hijo lleva icono', () => {
    for (const child of [billing, accounting].flatMap((group) => group.children ?? [])) {
      expect(child.icon).toBeTruthy()
    }
  })
})
