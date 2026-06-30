export const firmas = {
  title: 'Firmas pendientes',
  description:
    'Documentos que tu asesoría te ha enviado para firmar. Se abrirán en Odoo en una pestaña nueva.',
  pendingCount: '{count} pendientes',
  emptyTitle: 'Sin firmas pendientes',
  emptyDescription:
    'Cuando tu asesoría te envíe un documento para firmar, lo verás aquí.',
  signButton: 'Firmar',
  signHint: 'Se abrirá la firma en Odoo en una pestaña nueva.',
  refreshButton: 'Actualizar',
  refreshing: 'Actualizando…',
  states: {
    notLinked: {
      title: 'Cuenta sin vincular',
      description:
        'Tu perfil aún no está vinculado con Odoo. Contacta con tu asesor para activar las firmas en el portal.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tus firmas',
      description:
        'El servicio de Odoo no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    },
    odooRateLimited: {
      title: 'Demanda elevada',
      description:
        'El servidor está recibiendo mucha demanda en este momento. Vuelve a intentarlo en unos minutos.',
    },
    forbidden: {
      title: 'Sin acceso',
      description: 'Esta sección está disponible solo para clientes del portal.',
    },
  },
} as const
