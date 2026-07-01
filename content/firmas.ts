export const firmas = {
  list: {
    title: 'Solicitudes pendientes de firma',
    description:
      'Revisa cada documento y completa la firma cuando estés listo. La firma se abre en una pestaña nueva.',
    sentLabel: 'Enviado',
    dueLabel: 'Vence',
    statusPending: 'Pendiente de firma',
    dueSoon: 'Vence pronto',
    notificationNewFirma: 'Nueva solicitud de firma',
    signAction: 'Firmar documento',
  },
  emptyTitle: 'Sin firmas pendientes',
  emptyDescription:
    'Cuando tu asesoría te envíe un documento para firmar, lo verás aquí.',
  emptyHint:
    'No tienes ninguna acción pendiente por ahora. Si esperabas un documento, prueba a actualizar o contacta con tu asesor.',
  signButton: 'Firmar',
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
