export const portalDocuments = {
  tabLabel: 'Documentos',
  attachmentsTitle: 'Documentos',
  loadingAttachments: 'Cargando documentos…',
  emptyAttachments: 'No hay documentos adjuntos en este registro.',
  previewLabel: 'Ver documento',
  previewAction: 'Previsualizar',
  previewLoading: 'Cargando vista previa…',
  previewUnsupported:
    'No podemos previsualizar este tipo de archivo. Usa Descargar en el listado.',
  previewTooLarge:
    'El archivo es demasiado grande para previsualizarlo. Usa Descargar en el listado.',
  previewFormatBadge: 'El formato puede variar respecto al original',
  previewXlsxSheetsLabel: 'Hojas del libro Excel',
  previewXlsxEmptySheet: 'Esta hoja no tiene datos para mostrar.',
  pdfMobileHint:
    'En móvil el PDF se abre en una pestaña nueva con el visor de tu dispositivo.',
  pdfMobileOpen: 'Abrir PDF',
  closePreview: 'Cerrar vista previa',
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
