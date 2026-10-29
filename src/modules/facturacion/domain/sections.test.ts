import { describe, expect, it } from 'vitest'

import { isNestedPath, SECTIONS, sectionForPath, sectionHref } from '@/src/modules/facturacion/domain/sections'

describe('SECTIONS', () => {
  it('cada sección tiene un slug único y no vacío', () => {
    const slugs = SECTIONS.map((section) => section.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.every(Boolean)).toBe(true)
  })

  it('el panel es la primera sección', () => {
    expect(SECTIONS[0].id).toBe('panel')
  })

  it('sin periodo tampoco hay trimestres', () => {
    for (const section of SECTIONS) {
      if (!section.usesPeriod) expect(section.usesQuarter, section.id).toBe(false)
    }
  })

  it('los clientes y los productos no usan periodo; las facturas usan año y trimestre', () => {
    const byId = Object.fromEntries(SECTIONS.map((section) => [section.id, section]))
    expect(byId.products).toMatchObject({ usesPeriod: false, usesQuarter: false })
    expect(byId.settings).toBeUndefined()
    expect(byId.parties).toMatchObject({ usesPeriod: false, usesQuarter: false })
    expect(byId.panel).toMatchObject({ usesPeriod: true, usesQuarter: true })
    expect(byId.invoices).toMatchObject({ usesPeriod: true, usesQuarter: true })
  })
})

describe('sectionHref / sectionForPath', () => {
  it('toda sección vive bajo /facturacion/<slug>', () => {
    expect(sectionHref({ slug: 'facturas' })).toBe('/facturacion/facturas')
  })

  it('ida y vuelta: la ruta de cada sección vuelve a esa sección', () => {
    for (const section of SECTIONS) {
      expect(sectionForPath(sectionHref(section)).id).toBe(section.id)
    }
  })

  it('las pantallas anidadas pertenecen a su sección', () => {
    expect(sectionForPath('/facturacion/facturas/abc').id).toBe('invoices')
    expect(sectionForPath('/facturacion/facturas/abc/editar').id).toBe('invoices')
    expect(sectionForPath('/facturacion/facturas/nueva').id).toBe('invoices')
    expect(sectionForPath('/facturacion/clientes/nuevo').id).toBe('parties')
  })

  it('un slug que solo comparte el comienzo no cuenta como anidado', () => {
    expect(sectionForPath('/facturacion/facturas-antiguas').id).toBe('panel')
  })

  it('isNestedPath distingue la sección de sus pantallas de detalle', () => {
    expect(isNestedPath('/facturacion/facturas')).toBe(false)
    expect(isNestedPath('/facturacion/facturas/')).toBe(false)
    expect(isNestedPath('/facturacion/facturas/abc')).toBe(true)
    expect(isNestedPath('/facturacion/facturas/abc/editar')).toBe(true)
    expect(isNestedPath('/facturacion/panel')).toBe(false)
    expect(isNestedPath('/otra-cosa/x')).toBe(false)
  })

  it('tolera la barra final y cae al panel con una ruta desconocida', () => {
    expect(sectionForPath('/facturacion/facturas/').id).toBe('invoices')
    expect(sectionForPath('/facturacion/no-existe').id).toBe('panel')
    expect(sectionForPath('/facturacion').id).toBe('panel')
    expect(sectionForPath('/otra-cosa').id).toBe('panel')
  })
})
