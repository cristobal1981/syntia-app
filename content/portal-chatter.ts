export const portalChatter = {
  title: 'Conversación',
  loading: 'Cargando mensajes…',
  loadingOlder: 'Cargando mensajes anteriores…',
  empty: 'Todavía no hay mensajes en este trámite.',
  composerPlaceholder: 'Escribe un mensaje…',
  formatBold: 'Negrita',
  formatItalic: 'Cursiva',
  composerEmpty: 'Mensaje vacío',
  composerHasContent: 'Mensaje con contenido',
  sendButton: 'Enviar',
  sending: 'Enviando…',
  readOnlyClosedTicket:
    'Esta incidencia está cerrada. Puedes leer el historial, pero no enviar mensajes nuevos.',
  youLabel: 'Tú',
  errors: {
    forbidden: 'No tienes permiso para ver esta conversación.',
    not_linked: 'Tu cuenta no está vinculada con Odoo.',
    not_found: 'No encontramos el trámite solicitado.',
    odoo_unavailable: 'No pudimos acceder a la conversación. Inténtalo de nuevo.',
    invalid_body: 'El mensaje debe tener entre 1 y 2000 caracteres.',
    read_only: 'No puedes enviar mensajes en este trámite.',
  },
} as const
