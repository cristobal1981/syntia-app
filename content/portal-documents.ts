export const portalDocuments = {
  tabLabel: 'Documentos',
  attachmentsTitle: 'Documentos',
  loadingAttachments: 'Cargando documentos…',
  emptyAttachments: 'No hay documentos adjuntos en este registro.',
  downloadLabel: 'Descargar',
  downloading: 'Descargando…',
  stageLabel: 'Estado',
  errors: {
    forbidden: 'No tienes permiso para ver estos documentos.',
    not_linked: 'Tu cuenta no está vinculada con Odoo.',
    not_found: 'No encontramos el documento solicitado.',
    odoo_unavailable: 'No pudimos acceder a los documentos. Inténtalo de nuevo.',
    odoo_rate_limited:
      'El servidor está recibiendo mucha demanda. Vuelve a intentarlo en unos minutos.',
    emptyAttachments: 'No hay documentos adjuntos en este registro.',
  },
} as const
