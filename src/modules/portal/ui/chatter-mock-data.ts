import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'

export const CHATTER_MOCK_MESSAGES: PortalChatterMessage[] = [
  {
    id: 201,
    bodyHtml:
      '<p>Hola, ya tengo preparadas las facturas de abril a junio. ¿Te va bien si subo hoy toda la carpeta y revisamos el modelo 303 juntos?</p>',
    date: '2026-07-02T07:18:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
    attachments: [{ id: 801, name: 'facturas-q2.zip' }],
  },
  {
    id: 202,
    bodyHtml:
      '<p>Perfecto. Súbelo y me encargo de validar IVA soportado/repercutido. Si todo cuadra, te dejo el borrador hoy por la tarde.</p>',
    date: '2026-07-02T07:26:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
  },
  {
    id: 203,
    bodyHtml:
      '<p>Genial. También te dejo una duda: en mayo tuvimos una regularización por una devolución y me preocupa si eso cambia algo del trimestre.</p>',
    date: '2026-07-02T07:34:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
  },
  {
    id: 204,
    bodyHtml:
      '<p>Buena pregunta. En principio no te altera el cierre, pero necesito ver el detalle para confirmar compensaciones y base imponible exacta.</p>',
    date: '2026-07-02T07:42:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
    parentId: 203,
    parentPreview: {
      authorName: 'Cliente',
      snippet: '...tuvimos una regularización por una devolución...',
    },
  },
  {
    id: 205,
    bodyHtml:
      '<p>Te comparto todo en un solo mensaje para que no se nos quede nada fuera: durante el trimestre tuvimos ventas nacionales, una operación intracomunitaria puntual, gastos recurrentes de software, y además la devolución que te comentaba antes. En abril y mayo emitimos varias facturas rectificativas porque cambiamos tarifas y hubo abonos parciales de clientes antiguos. También hay dos gastos con prorrata que no sé si meter completos o ajustar, y un anticipo que entró al cierre de junio pero la factura final se emitió ya en julio. Si te parece, en cuanto revises el ZIP te paso también un resumen por bloques con referencia de asiento para que lo tengas todo ordenado y lo podamos cerrar hoy sin sorpresas.</p>',
    date: '2026-07-02T07:55:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
    attachments: [
      { id: 802, name: 'resumen-operaciones-q2.pdf' },
      { id: 803, name: 'detalle-regularizacion.xlsx' },
    ],
  },
  {
    id: 206,
    bodyHtml:
      '<p>Recibido. Ya he cruzado una parte y te dejo avance: el IVA va bastante alineado, pero necesito confirmar dos tickets de combustible y un gasto de software con factura extranjera.</p>',
    date: '2026-07-02T08:07:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
    attachments: [{ id: 804, name: 'avance-revision-iva.pdf' }],
  },
  {
    id: 207,
    bodyHtml:
      '<p>Te paso ahora mismo esos dos tickets y la factura de software. La extranjera está en inglés, por si prefieres que te marque los importes en un comentario aparte.</p>',
    date: '2026-07-02T08:15:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
    attachments: [
      { id: 805, name: 'ticket-gasolina-14-05.jpg' },
      { id: 806, name: 'ticket-gasolina-22-05.jpg' },
      { id: 807, name: 'invoice-software-may.pdf' },
    ],
  },
  {
    id: 208,
    bodyHtml:
      '<p>Perfecto. Para dejarlo cerrado hoy, ¿me confirmas también si el anticipo de junio se cobró íntegro o hubo retención parcial?</p>',
    date: '2026-07-02T08:23:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
    parentId: 205,
  },
  {
    id: 209,
    bodyHtml:
      '<p>Fue íntegro, sin retención. Te adjunto extracto y justificante de pago para que no haya duda.</p>',
    date: '2026-07-02T08:28:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
    parentId: 208,
    attachments: [
      { id: 808, name: 'extracto-junio.pdf' },
      { id: 809, name: 'justificante-anticipo.pdf' },
    ],
  },
  {
    id: 210,
    bodyHtml:
      '<p>Con esto ya me cuadra todo. Te envío en unos minutos el borrador final del 303 y, si te encaja, lo presentamos hoy antes de las 13:00.</p>',
    date: '2026-07-02T08:36:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
  },
  {
    id: 211,
    bodyHtml:
      '<p>Genial, gracias. En cuanto me lo pases lo reviso al momento y te confirmo en este mismo hilo.</p>',
    date: '2026-07-02T08:41:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
  },
  {
    id: 212,
    bodyHtml:
      '<p>Te lo acabo de subir aquí. Si ves todo correcto, responde con un “OK presentar” y lo dejamos presentado.</p>',
    date: '2026-07-02T08:49:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
    attachments: [{ id: 810, name: 'borrador-final-modelo-303.pdf' }],
  },
]

let mockMessageId = 200

export function createMockMessageId(): number {
  mockMessageId += 1
  return mockMessageId
}
