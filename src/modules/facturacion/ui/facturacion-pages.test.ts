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
import { FacturacionShell, PeriodBar } from '@/src/modules/facturacion/ui/facturacion-shell'
import { InvoicesTab } from '@/src/modules/facturacion/ui/invoices-tab'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'
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

  it('muestra el borrador sin número, la corrección y la factura corregida', () => {
    const plain = text(html)
    expect(plain).toContain('Sin número (borrador)')
    expect(plain).toContain('Corrección')
    expect(plain).toContain('Corregida')
    expect(plain).toContain('Borrador')
  })

  it('cada fila lleva un único estado: cobro, no ciclo de vida ni revisión', () => {
    const plain = text(html)
    expect(plain).toContain('Cobrada')
    expect(plain).not.toContain('Expedida')
    expect(plain).not.toContain('Sin revisar')
    expect(plain).not.toContain('Revisada')
  })

  it('habla de emitir y corregir, no de expedir ni rectificar, en la lista y el panel', () => {
    const panel = text(render('/facturacion/panel', createElement(PanelSection)))
    for (const plain of [text(html), panel]) {
      expect(plain).not.toMatch(/expedi|rectificativ|rectificad|inalterab/i)
    }
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

  it('la acción de crear está en la barra fija, no repetida en la lista, y no hay recibidas ni subir documentos', () => {
    expect(html).not.toContain('href="/facturacion/facturas/nueva"')
    expect(html).not.toContain('tipo=recibida')
    expect(text(html)).not.toContain('Subir factura')
    expect(text(html)).not.toContain('Recibidas')
  })

  it('móvil primero: tarjetas apiladas con cliente, total, número, fecha y estado; la tabla solo desde md', () => {
    expect(html).toContain('flex flex-col gap-2 md:hidden')
    expect(html).toContain('hidden md:block')
    // Cada tarjeta es un enlace a la ficha, sin enlaces anidados.
    const cards = html.slice(html.indexOf('flex flex-col gap-2 md:hidden'), html.indexOf('hidden md:block'))
    expect(cards.match(/href="\/facturacion\/facturas\/ejemplo-/g)?.length).toBeGreaterThan(5)
    for (const card of cards.split('<li ').slice(1)) expect(card.match(/<a /g)?.length).toBe(1)
    expect(text(cards)).toContain('Hotel Costa Teguise S.L.')
    expect(text(cards)).toContain('Vence el')
  })

  it('móvil primero: los filtros de estado hacen scroll en una línea y desde sm pasan a la fila con el buscador', () => {
    expect(html).toContain('flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible')
    expect(html).toContain('flex flex-col gap-3 sm:flex-row sm:flex-wrap')
  })

  it('el buscador es táctil en móvil: alto de 44 px y 16 px de letra para que iOS no haga zoom', () => {
    expect(html).toContain('h-11 w-full text-base')
  })

  it('solo hay facturas emitidas: ninguna recibida de ejemplo', () => {
    expect(html).not.toContain('Endesa')
    expect(html).not.toContain('Vodafone')
  })
})

describe('ficha de una factura', () => {
  it('factura emitida: documento con sus datos, aviso de que no se puede modificar y corregir; sin editar ni borrar', () => {
    const html = render('/facturacion/facturas/ejemplo-06', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-06' }))
    const plain = text(html)

    expect(plain).toContain('F-2026-0003')
    expect(plain).toContain('Factura emitida: no se puede modificar')
    expect(plain).toContain('Estudio Gráfico Tías (demo)')
    expect(plain).toContain('Cabildo de Lanzarote')
    expect(html).toContain('/rectificar')
    expect(html).not.toContain('/editar')
    expect(plain).not.toContain('Eliminar')
    expect(plain).not.toContain('Asiento contable')
    expect(plain).toContain('Historial')
  })

  it('la acción principal depende del estado: pendiente de cobro → «Marcar como cobrada»; cobrada → ninguna', () => {
    const pending = text(render('/facturacion/facturas/ejemplo-09', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-09' })))
    expect(pending).toContain('Marcar como cobrada')
    expect(pending).toContain('Corregir')
    const paid = text(render('/facturacion/facturas/ejemplo-06', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-06' })))
    expect(paid).not.toContain('Marcar como cobrada')
    expect(paid).toContain('Más')
  })

  it('las acciones secundarias (revisión, quitar cobro) no están a la vista; la revisión es un dato de la ficha', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-06', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-06' })))
    expect(plain).not.toContain('Marcar como revisada')
    expect(plain).not.toContain('Quitar el cobro')
    expect(plain).toContain('Revisión de la asesoría')
  })

  it('una corrección no ofrece cobrarse ni corregirse', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-r1', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-r1' })))
    expect(plain).not.toContain('Marcar como cobrada')
    expect(plain).not.toContain('Corregir')
  })

  it('el historial va plegado con su recuento y los importes no se repiten fuera del documento', () => {
    const html = render('/facturacion/facturas/ejemplo-06', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-06' }))
    expect(html).toMatch(/<details[^>]*>\s*<summary[^>]*>[^]*Historial/)
    expect(text(html)).toMatch(/\d+ apuntes?|0 apuntes/)
    expect(text(html)).not.toContain('Importes')
  })

  it('factura corregida: enlaza con su corrección y muestra el importe vigente', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-02', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-02' })))
    expect(plain).toContain('Corregida por')
    expect(plain).toContain('R-2026-0001')
    expect(plain).toContain('Importe vigente tras corregir')
  })

  it('corrección: cita la factura corregida y el motivo (el documento conserva el término legal)', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-r1', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-r1' })))
    expect(plain).toContain('FACTURA RECTIFICATIVA')
    expect(plain).toContain('Rectifica la factura F-2026-0002')
    expect(plain).toContain('Descuento por volumen pactado')
  })

  it('borrador: se puede emitir y editar, con Eliminar recogido en «Más», y avisa de que aún no tiene número', () => {
    const html = render('/facturacion/facturas/ejemplo-15', createElement(InvoiceDetailSection, { invoiceId: 'ejemplo-15' }))
    const plain = text(html)

    expect(plain).toContain('Emitir factura')
    expect(plain).toContain('Más')
    expect(plain).not.toContain('Eliminar')
    expect(html).toContain('/editar')
    expect(plain).toContain('Todavía no tiene número')
    expect(plain).toContain('BORRADOR')
  })

  it('una factura inexistente lo dice, explica por qué y ofrece volver a la lista', () => {
    const html = render('/facturacion/facturas/nope', createElement(InvoiceDetailSection, { invoiceId: 'nope' }))
    expect(text(html)).toContain('No encontramos esta factura')
    expect(text(html)).toContain('Puede que se haya eliminado')
    expect(html).toContain('href="/facturacion/facturas"')
    expect(text(html)).toContain('Volver a facturas')
  })

  it('lo mismo al editar o corregir una factura que no existe', () => {
    const edit = render('/facturacion/facturas/nope/editar', createElement(EditInvoiceSection, { invoiceId: 'nope' }))
    const fix = render('/facturacion/facturas/nope/rectificar', createElement(RectifyInvoiceSection, { invoiceId: 'nope' }))
    for (const html of [edit, fix]) {
      expect(text(html)).toContain('No encontramos esta factura')
      expect(html).toContain('href="/facturacion/facturas"')
    }
  })
})

describe('formularios de factura', () => {
  it('nueva factura: sin número (lo asigna la emisión), con "Guardar y emitir"', () => {
    const plain = text(render('/facturacion/facturas/nueva', createElement(NewInvoiceSection)))
    expect(plain).toContain('Nueva factura')
    expect(plain).toContain('los asigna la aplicación al emitir la factura')
    expect(plain).toContain('Guardar borrador')
    expect(plain).toContain('Guardar y emitir')
    expect(plain).not.toContain('Número de factura')
  })

  it('el formulario no pide tipo, proveedor, parte deducible ni documento adjunto', () => {
    const plain = text(render('/facturacion/facturas/nueva', createElement(NewInvoiceSection)))
    expect(plain).not.toContain('Proveedor')
    expect(plain).not.toContain('Parte deducible')
    expect(plain).not.toContain('Documento adjunto')
  })

  it('editar una factura emitida no muestra el formulario: avisa de que no se puede modificar', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-06/editar', createElement(EditInvoiceSection, { invoiceId: 'ejemplo-06' })))
    expect(plain).toContain('ya está emitida y no se puede editar')
    expect(plain).not.toContain('Guardar')
  })

  it('editar un borrador muestra el formulario con sus datos', () => {
    const html = render('/facturacion/facturas/ejemplo-15/editar', createElement(EditInvoiceSection, { invoiceId: 'ejemplo-15' }))
    expect(text(html)).toContain('Editar factura')
    expect(html).toContain('Diseño de la web corporativa')
  })
})

describe('rectificar', () => {
  it('una factura emitida muestra el formulario y la vista previa de la corrección', () => {
    const plain = text(render('/facturacion/facturas/ejemplo-06/rectificar', createElement(RectifyInvoiceSection, { invoiceId: 'ejemplo-06' })))
    expect(plain).toContain('Corregir la factura F-2026-0003')
    expect(plain).toContain('Motivo de la corrección')
    expect(plain).toContain('Emitir corrección')
    expect(plain).toContain('Así quedará la corrección')
  })

  it('un borrador o una corrección no se pueden corregir', () => {
    const draft = text(render('/facturacion/facturas/ejemplo-15/rectificar', createElement(RectifyInvoiceSection, { invoiceId: 'ejemplo-15' })))
    expect(draft).toContain('no se puede corregir')
    const rect = text(render('/facturacion/facturas/ejemplo-r1/rectificar', createElement(RectifyInvoiceSection, { invoiceId: 'ejemplo-r1' })))
    expect(rect).toContain('no se puede corregir')
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
    // Una vez en la tabla (desde md) y otra en la tarjeta (móvil): nunca duplicado dentro de un mismo diseño.
    expect((plain.match(/Hotel Costa Teguise S\.L\./g) ?? []).length).toBe(2)
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
    expect(plain).toContain('no afectan a las facturas ya emitidas')
    expect(html).toContain('/facturacion/facturas/')
  })

  it('un cliente inexistente lo dice y ofrece volver a la lista', () => {
    const html = render('/facturacion/clientes/zzz', createElement(EditPartySection, { partyId: 'zzz' }))
    expect(text(html)).toContain('No encontramos este cliente')
    expect(html).toContain('href="/facturacion/clientes"')
  })
})

describe('datos fiscales y panel', () => {
  it('datos fiscales: formulario con el emisor cargado', () => {
    const html = render('/facturacion/configuracion', createElement(SettingsSection))
    expect(html).toContain('Estudio Gráfico Tías (demo)')
    expect(text(html)).toContain('Guardar datos fiscales')
  })

  it('el panel incluye la revisión de las facturas y avisa de lo que no incluye', () => {
    const plain = text(render('/facturacion/panel', createElement(PanelSection)))
    expect(plain).toContain('Revisión de tus facturas')
    expect(plain).toContain('Numeración correlativa, sin saltos ni repetidos')
    expect(plain).toContain('Datos fiscales del emisor completos')
    expect(plain).toContain('1 corrección')
    expect(plain).toContain('1 borrador pendiente de emitir')
    expect(plain).toContain('No incluye Veri*factu')
  })

  it('el panel abre con lo pendiente de cobro y las vencidas, antes que el gráfico y la revisión', () => {
    const plain = text(render('/facturacion/panel', createElement(PanelSection)))
    expect(plain.indexOf('Pendiente de cobro')).toBeGreaterThanOrEqual(0)
    expect(plain.indexOf('Facturas vencidas')).toBeGreaterThan(plain.indexOf('Pendiente de cobro'))
    expect(plain.indexOf('Facturado por mes')).toBeGreaterThan(plain.indexOf('Facturas vencidas'))
    expect(plain.indexOf('Revisión de tus facturas')).toBeGreaterThan(plain.indexOf('Facturado por mes'))
  })

  it('la revisión de las facturas se despliega sola si hay algo que atender y se pliega si todo está bien', () => {
    const html = render('/facturacion/panel', createElement(PanelSection))
    expect(html).toMatch(/<details[^>]*open[^>]*>/)
    expect(text(html)).toContain('Hay algo que revisar')
  })

  it('el panel no tiene panel de proveedores', () => {
    const plain = text(render('/facturacion/panel', createElement(PanelSection)))
    expect(plain).not.toContain('Pendiente de pago')
    expect(plain).not.toContain('Principales proveedores')
  })
})

describe('estados vacíos y carga', () => {
  const tab = (invoices: typeof SAMPLE_INVOICES, all: typeof SAMPLE_INVOICES) =>
    text(render('/facturacion/facturas', createElement(InvoicesTab, { invoices: [...invoices], allInvoices: [...all], today: '2026-10-16' })))

  it('sin facturas en el periodo pero con facturas en otros, lo dice y apunta a cambiar el periodo', () => {
    const plain = tab([], SAMPLE_INVOICES)
    expect(plain).toContain('Todavía no hay facturas en este periodo')
    expect(plain).toContain('Tienes facturas en otros periodos')
    expect(plain).toContain('Nueva factura')
  })

  it('sin ninguna factura no habla de otros periodos', () => {
    const plain = tab([], [])
    expect(plain).toContain('Todavía no hay facturas en este periodo')
    expect(plain).not.toContain('otros periodos')
  })

  it('hasta que el navegador carga sus datos se ve un esqueleto, no los de ejemplo ni el contenido', () => {
    nav.pathname = '/facturacion/panel'
    const html = renderToString(
      createElement(TooltipProvider, null, createElement(FacturacionShell, null, createElement('p', null, 'CONTENIDO DE LA PANTALLA')))
    )
    expect(html).not.toContain('CONTENIDO DE LA PANTALLA')
    expect(text(html)).toContain('Vista de prueba en tu ordenador')
  })
})

describe('filtro de periodo fijo', () => {
  const bar = (path: string) => render(path, createElement(PeriodBar))

  it('Panel y Facturas comparten el mismo filtro, fijo arriba al desplazarse desde md', () => {
    for (const path of ['/facturacion/panel', '/facturacion/facturas']) {
      const html = bar(path)
      expect(html, path).toContain('md:sticky')
      // Desde md queda por debajo de la esquina cóncava del topbar, sin cubrirla.
      expect(html, path).toContain('md:top-[calc(var(--radius-xl)-2.5rem)]')
      expect(html, path).toContain('md:before:left-[var(--radius-xl)]')
      // El aire sobre y bajo los controles es el mismo: la franja superior aporta el radio, la barra no suma relleno arriba.
      expect(html, path).toContain('md:pt-0 md:pb-[var(--radius-xl)]')
      expect(html, path).toContain('md:before:h-[var(--radius-xl)]')
      expect(html, path).toContain('aria-label="Periodo"')
      expect(text(html), path).toContain('Año completo')
      expect(text(html), path).toContain('4T')
    }
  })

  it('la barra lleva a la derecha la acción de crear factura, igual en Panel y Facturas', () => {
    for (const path of ['/facturacion/panel', '/facturacion/facturas']) {
      const html = bar(path)
      expect(html, path).toContain('href="/facturacion/facturas/nueva"')
      expect(text(html), path).toContain('Nueva factura')
    }
  })

  it('móvil primero: dos selectores y un «+» sin texto; los chips y el botón con texto solo desde md', () => {
    const html = bar('/facturacion/facturas')
    expect(html).toContain('aria-label="Año"')
    expect(html).toContain('aria-label="Trimestre"')
    // El selector de trimestre solo existe en móvil; desde md lo sustituyen los chips.
    expect(html).toMatch(/aria-label="Trimestre"[^>]*md:hidden|md:hidden[^>]*aria-label="Trimestre"/)
    expect(html).toMatch(/aria-label="Nueva factura"/)
    expect(html).toContain('hidden md:inline')
    // Desde md el botón vuelve a la altura normal (h-8); `size-auto` lo dejaba sin altura.
    expect(html).toContain('md:h-8 md:w-auto')
    expect(html).not.toContain('md:size-auto')
    expect(html).toContain('hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto md:flex')
    expect(html).not.toContain('overflow-x-auto md:overflow')
  })

  it('el panel no repite la acción dentro de la tarjeta de pendiente', () => {
    const html = render('/facturacion/panel', createElement(PanelSection))
    expect(html).not.toContain('href="/facturacion/facturas/nueva"')
  })

  it('la lista agrupa los filtros de estado y el buscador en una sola fila de herramientas', () => {
    const html = render('/facturacion/facturas', createElement(InvoicesSection))
    expect(html).toMatch(/aria-pressed="true"[^]*type="search"/)
    expect(html).toContain('sm:ml-auto')
  })

  it('Clientes y Datos fiscales no tienen filtro de periodo', () => {
    for (const path of ['/facturacion/clientes', '/facturacion/configuracion']) {
      expect(bar(path), path).toBe('')
    }
  })

  it('las pantallas de detalle, edición y alta tampoco', () => {
    for (const path of ['/facturacion/facturas/ejemplo-01', '/facturacion/facturas/nueva', '/facturacion/clientes/nuevo']) {
      expect(bar(path), path).toBe('')
    }
  })
})
