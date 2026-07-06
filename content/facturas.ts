export const facturas = {
  title: 'Facturación',
  description:
    'Emite tus facturas verificables (VERI*FACTU) y consulta su estado en la AEAT.',
  newInvoice: 'Nueva factura',
  refresh: 'Actualizar',
  emptyTitle: 'Sin facturas',
  emptyDescription:
    'Todavía no has emitido ninguna factura. Crea la primera con «Nueva factura».',
  columns: {
    number: 'Número',
    customer: 'Cliente',
    date: 'Fecha',
    total: 'Total',
    verifactu: 'VERI*FACTU',
    actions: 'Acciones',
  },
  form: {
    customerName: 'Nombre del cliente',
    customerVat: 'NIF del cliente (opcional en simplificadas)',
    lineDescription: 'Concepto',
    lineQuantity: 'Cantidad',
    linePriceUnit: 'Precio unitario (€)',
    addLine: 'Añadir línea',
    removeLine: 'Quitar línea',
    submitDraft: 'Guardar borrador',
    submitting: 'Guardando…',
  },
  actions: {
    emit: 'Emitir',
    emitting: 'Emitiendo…',
    retrySend: 'Reintentar envío',
    downloadPdf: 'PDF',
    rectify: 'Rectificar',
    cancel: 'Anular',
    confirmCancel:
      'Se generará un registro de anulación VERI*FACTU ante la AEAT. ¿Continuar?',
  },
  verifactuStates: {
    unknown: 'Desconocido',
    not_sent: 'Sin enviar',
    queued: 'En cola',
    sent_pending: 'Enviado (pendiente)',
    registered: 'Registrado en AEAT',
    registered_with_errors: 'Registrado con errores',
    rejected: 'Rechazado',
    cancelled: 'Anulado',
  },
  invoiceStates: {
    draft: 'Borrador',
    posted: 'Emitida',
    cancel: 'Cancelada',
  },
  toasts: {
    draftCreated: 'Borrador creado.',
    emitted: 'Factura emitida y envío VERI*FACTU encolado.',
    sendRetried: 'Envío VERI*FACTU reintentado.',
    cancelled: 'Anulación solicitada.',
    rectified: 'Rectificativa creada en borrador.',
    genericError: 'No se pudo completar la operación. Inténtalo de nuevo.',
  },
  states: {
    notLinked: {
      title: 'Facturación no activada',
      description:
        'Tu cuenta aún no tiene la facturación VERI*FACTU activada. Contacta con tu asesor para activarla.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tus facturas',
      description:
        'El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    },
    odooRateLimited: {
      title: 'Demanda elevada',
      description:
        'El servidor está recibiendo mucha demanda. Vuelve a intentarlo en unos minutos.',
    },
    forbidden: {
      title: 'Sin acceso',
      description: 'Esta sección está disponible solo para clientes del portal.',
    },
  },
} as const
