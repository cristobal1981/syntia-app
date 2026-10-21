export const pushNotifications = {
  title: 'Notificaciones en este dispositivo',
  description:
    'Recibe un aviso del sistema cuando tu asesoría te escriba o haya algo pendiente, aunque no tengas Syntia abierta.',
  enable: 'Activar notificaciones',
  types: {
    chatter: 'Mensajes de tu asesoría',
    status: 'Cambios solicitados y estados de trámites',
    firmas: 'Firmas pendientes',
  },
  states: {
    loading: 'Comprobando…',
    unsupported: 'Este navegador no admite notificaciones push.',
    installRequired:
      'En iPhone y iPad hay que instalar Syntia primero: en Safari, Compartir → «Añadir a pantalla de inicio», y activarlas desde la app.',
    denied:
      'Has bloqueado las notificaciones de Syntia en este navegador. Actívalas desde los permisos del sitio y vuelve aquí.',
  },
  toasts: {
    enabled: 'Notificaciones activadas en este dispositivo.',
    disabled: 'Notificaciones desactivadas en este dispositivo.',
    saved: 'Preferencias guardadas.',
  },
  errors: {
    generic: 'No pudimos guardar el cambio. Inténtalo de nuevo.',
    rate_limited: 'Demasiados intentos. Espera un poco e inténtalo de nuevo.',
  },
  payload: {
    chatterTitle: 'Nuevo mensaje de tu asesoría',
    statusTitle: 'Novedad en tu trámite',
    newTramiteTitle: 'Nuevo trámite',
    firmaTitle: 'Tienes una firma pendiente',
    firmaDueTitle: 'Una firma está a punto de vencer',
    summaryTitle: (count: number) => `Tienes ${count} novedades en Syntia`,
  },
} as const
