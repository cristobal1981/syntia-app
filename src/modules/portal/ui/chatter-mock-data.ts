import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'

export const CHATTER_MOCK_MESSAGES: PortalChatterMessage[] = [
  {
    id: 101,
    bodyHtml: '<p>Hola, he revisado la documentación inicial. ¿Podéis confirmar el modelo 303 del trimestre?</p>',
    date: '2026-06-28T09:15:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
    attachments: [
      { id: 501, name: 'Checklist-trimestre.pdf' },
    ],
  },
  {
    id: 102,
    bodyHtml: '<p>Sí, te adjunto el borrador para revisión.</p>',
    date: '2026-06-28T10:02:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
    attachments: [{ id: 502, name: 'borrador-303.pdf' }],
  },
  {
    id: 103,
    bodyHtml: '<p>Perfecto, lo revisamos y te confirmamos en breve.</p>',
    date: '2026-06-28T11:30:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
  },
  {
    id: 104,
    bodyHtml: '<p>¿Incluimos también las facturas de abril?</p>',
    date: '2026-06-29T08:45:00.000Z',
    authorName: 'Cliente',
    isFromClient: true,
    parentId: 101,
    parentPreview: {
      authorName: 'María López',
      snippet: '¿Podéis confirmar el modelo 303 del trimestre?',
    },
  },
  {
    id: 105,
    bodyHtml:
      '<p>Sí, por favor. Puedes subirlas aquí o en la pestaña Documentos.</p>',
    date: '2026-06-29T09:10:00.000Z',
    authorName: 'María López',
    authorPartnerId: 42,
    isFromClient: false,
    attachments: [
      { id: 503, name: 'plantilla-carga.xlsx' },
      { id: 504, name: 'instrucciones.pdf' },
    ],
  },
]

let mockMessageId = 200

export function createMockMessageId(): number {
  mockMessageId += 1
  return mockMessageId
}
