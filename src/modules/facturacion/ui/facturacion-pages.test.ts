import { createElement, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ pathname: '/facturacion/panel', search: '' }))

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import { TooltipProvider } from '@/components/ui/tooltip'
import { FacturacionProvider } from '@/src/modules/facturacion/ui/facturacion-provider'
import {
  EditInvoiceSection,
  EditPartySection,
  InvoiceDetailSection,
  InvoicesSection,
  NewInvoiceSection,
  NewPartySection,
  PanelSection,
  PartiesSection,
  RectifyInvoiceSection,
  SettingsSection,
} from '@/src/modules/facturacion/ui/section-views'

function render(path: string, element: ReactElement, search = ''): string {
  nav.pathname = path
  nav.search = search
  return renderToString(createElement(TooltipProvider, null, createElement(FacturacionProvider, null, element)))
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')

beforeEach(() => {
  nav.pathname = '/facturacion/panel'
  nav.search = ''
})

describe('lista de facturas', () => {
  const html = render('/facturacion/facturas', createElement(InvoicesSection))

  it('cada fila es un enlace a la ficha de la factura', () => {
    expect(html).toContain('href="/facturacion/facturas/ejemplo-01"')
    expect(html).toContain('F-2026-0001')
  })

  it('muestra el borrador sin número, la rectificativa y la factura rectificada', () => {
    const plain = text(html)
    expect(plain).toContain('Sin número (borrador)')
    expect(plain).toContain('Rectificativa')
    expect(plain).toContain('Rectificada')
    expect(plain).toContain('Borrador')
  })

  it('cada fila lleva un único estado: cobro, no ciclo de vida ni revisión', () => {
    const plain = text(html)
    expect(plain).toContain('Cobrada')
    expect(plain).not.toContain('Expedida')
    expect(plain).not.toContain('Sin revisar')
    expect(plain).not.toContain('Revisada')
  })

  it('resume lo filtrado: número de facturas, facturado y pendiente de cobro', () => {
    const plain = text(html)
    expect(plain).toMatch(/\d+ facturas · Facturado [\d.,]+ € · Pendiente de cobro [\d.,]+ €/)
  })

  it('el vencimiento va bajo la fecha y no hay columna de acciones', () => {
    const plain = text(html)
    expect(plain).toMatch(/Vencida hace \d+ días?/)
    expect(plain).not.toContain('Ver detalle')
    expect(plain).not.toContain('Acciones')
  })

  it('ofrece crear una factura y nada de recibidas ni subir documentos', () => {
    expect(html).toContain('href="/facturacion/facturas/nueva"')
    expect(html).not.toContain('tipo=recibida')
    expect(text(html)).not.toContain('Subir factura')
    expect(text(html)).not.toContain('Recibidas')
  })

  it('solo hay facturas emitidas: ninguna recibida de ejemplo', () => {
    expect(html).not.toContain('Endesa')
    expect(html).not.toContain('Vodafone')
  })
})

describe('ficha de una factura', () => {
  it('emitida expedida: documento con sus datos, aviso de inalterable y rectificar; sin editar ni borrar', () => {
    const html = render('/facturacion/facturas/ejemplo-06', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-06' }))
    const plain = text(html)

    expect(plain).toContain('F-2026-0003')
    expect(plain).toContain('Factura expedida: inalterable')
    expect(plain).toContain('Estudio Gráfico Tías (demo)')
    expect(plain).toContain('Cabildo de Lanzarote')
    expect(html).toContain('/rectificar')
    expect(html).not.toContain('/editar')
    expect(plain).not.toContain('Eliminar')
    expect(plain).not.toContain('Asiento contable')
    expect(plain).toContain('Historial')
  })

  it('emitida rectificada: enlaza con su rectificativa y muestra el importe vigente', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-02', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-02' })))
    expect(plain).toContain('Rectificada por')
    expect(plain).toContain('R-2026-0001')
    expect(plain).toContain('Importe vigente tras rectificar')
  })

  it('rectificativa: cita la factura rectificada y el motivo', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-r1', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-r1' })))
    expect(plain).toContain('FACTURA RECTIFICATIVA')
    expect(plain).toContain('Rectifica la factura F-2026-0002')
    expect(plain).toContain('Descuento por volumen pactado')
  })

  it('borrador: se puede expedir, editar y eliminar, y avisa de que no cuenta aún', () => {
    const html = render('/facturacion/facturas/ejemplo-15', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-15' }))
    const plain = text(html)

    expect(plain).toContain('Expedir factura')
    expect(plain).toContain('Eliminar')
    expect(html).toContain('/editar')
    expect(plain).toContain('Todavía no tiene número')
    expect(plain).toContain('BORRADOR')
  })

  it('una factura inexistente lo dice y vuelve a la lista', () => {
    const html = render('/facturacion/facturas/nope', createElement(InvoiceDetailSection, { invoiceId: 'nope' }))
    expect(text(html)).toContain('No encontramos esta factura')
  })
})

describe('formularios de factura', () => {
  it('nueva factura: sin número (lo asigna la expedición), con "Guardar y expedir"', () => {
    const plain = text(render('/facturacion/facturas/nueva', createElement(NewInvoiceSection)))
    expect(plain).toContain('Nueva factura')
    expect(plain).toContain('los asigna la aplicación al expedir')
    expect(plain).toContain('Guardar borrador')
    expect(plain).toContain('Guardar y expedir')
    expect(plain).not.toContain('Número de factura')
  })

  it('el formulario no pide tipo, proveedor, parte deducible ni documento adjunto', () => {
    const plain = text(render('/facturacion/facturas/nueva', createElement(NewInvoiceSection)))
    expect(plain).not.toContain('Proveedor')
    expect(plain).not.toContain('Parte deducible')
    expect(plain).not.toContain('Documento adjunto')
  })

  it('editar una expedida no muestra el formulario: avisa de que es inalterable', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-06/editar', createElement(EditInvoiceSection, { invoiceId: 'ejemplo-06' })))
    expect(plain).toContain('ya está expedida y no se puede editar')
    expect(plain).not.toContain('Guardar')
  })

  it('editar un borrador muestra el formulario con sus datos', () => {
    const html = render('/facturacion/facturas/ejemplo-15/editar', createElement(EditInvoiceSection, { invoiceId: 'ejemplo-15' }))
    expect(text(html)).toContain('Editar factura')
    expect(html).toContain('Diseño de la web corporativa')
  })
})

describe('rectificar', () => {
  it('una expedida muestra el formulario y la vista previa de la rectificativa', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-06/rectificar', createElement(RectifyInvoiceSection, { invoiceId: 'ejemplo-06' })))
    expect(plain).toContain('Rectificar la factura F-2026-0003')
    expect(plain).toContain('Motivo de la rectificación')
    expect(plain).toContain('Emitir rectificativa')
    expect(plain).toContain('Así quedará la rectificativa')
  })

  it('un borrador o una rectificativa no se pueden rectificar', () => {
    const draft = text(render('/facturacion/facturas/ejemplo-15/rectificar', createElement(RectifyInvoiceSection, { invoiceId: 'ejemplo-15' })))
    expect(draft).toContain('no se puede rectificar')
    const rect = text(render('/facturacion/facturas/ejemplo-r1/rectificar', createElement(RectifyInvoiceSection, { invoiceId: 'ejemplo-r1' })))
    expect(rect).toContain('no se puede rectificar')
  })
})

describe('clientes', () => {
  it('el directorio lista los clientes con enlace a su ficha y botones para crear', () => {
    const html = render('/facturacion/clientes', createElement(PartiesSection))
    expect(text(html)).toContain('Hotel Costa Teguise S.L.')
    expect(text(html)).toContain('Clínica Dental Sonrisa S.L.')
    expect(html).toContain('href="/facturacion/clientes/nuevo"')
    expect(html).toMatch(/href="\/facturacion\/clientes\/tercero-\d+"/)
  })

  it('un único directorio de clientes, sin proveedores ni columnas de recibido', () => {
    const plain = text(render('/facturacion/clientes', createElement(PartiesSection)))
    expect(plain).toContain('Facturado')
    expect(plain).not.toContain('Recibido')
    expect(plain).not.toContain('Proveedores')
    expect((plain.match(/Hotel Costa Teguise S\.L\./g) ?? []).length).toBe(1)
  })

  it('el alta de cliente no sugiere nada con el formulario vacío', () => {
    const plain = text(render('/facturacion/clientes/nuevo', createElement(NewPartySection)))
    expect(plain).toContain('Nuevo cliente')
    expect(plain).not.toContain('Puede que ya exista')
  })

  it('la ficha de un cliente con facturas muestra sus cifras, sus facturas y avisa de que no se puede borrar', () => {
    const html = render('/facturacion/clientes/tercero-1', createElement(EditPartySection, { partyId: 'tercero-1' }))
    const plain = text(html)
    expect(plain).toContain('Facturas de este cliente')
    expect(plain).toContain('no afectan a las facturas ya expedidas')
    expect(html).toContain('/facturacion/facturas/')
  })

  it('un cliente inexistente lo dice', () => {
    expect(text(render('/facturacion/clientes/zzz', createElement(EditPartySection, { partyId: 'zzz' })))).toContain('No encontramos este cliente')
  })
})

describe('datos fiscales y panel', () => {
  it('datos fiscales: formulario con el emisor cargado', () => {
    const html = render('/facturacion/configuracion', createElement(SettingsSection))
    expect(html).toContain('Estudio Gráfico Tías (demo)')
    expect(text(html)).toContain('Guardar datos fiscales')
  })

  it('el panel incluye las comprobaciones de cumplimiento y avisa de lo que no incluye', () => {
    const plain = text(render('/facturacion/panel', createElement(PanelSection)))
    expect(plain).toContain('Cumplimiento de facturación')
    expect(plain).toContain('Numeración correlativa, sin saltos ni repetidos')
    expect(plain).toContain('Datos fiscales del emisor completos')
    expect(plain).toContain('1 rectificativa en serie propia')
    expect(plain).toContain('1 borrador pendiente de expedir')
    expect(plain).toContain('No incluye Veri*factu')
  })

  it('el panel muestra lo pendiente de cobro y no hay panel de proveedores', () => {
    const plain = text(render('/facturacion/panel', createElement(PanelSection)))
    expect(plain).toContain('Pendiente de cobro')
    expect(plain).not.toContain('Pendiente de pago')
    expect(plain).not.toContain('Principales proveedores')
  })
})
