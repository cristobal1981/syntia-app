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
    chatterTitle: (name: string) => `Nuevo mensaje en «${name}»`,
    chatterBodyFallback: 'Tu asesoría te ha escrito.',
    statusTitle: (name: string, newState?: string) =>
      newState ? `«${name}»: ${newState}` : `Novedad en «${name}»`,
    statusBodyChangesRequested: 'Tu asesoría te pide cambios. Entra para verlos.',
    statusBodyFrom: (previous: string) => `Antes: ${previous}`,
    statusBodyFallback: 'El estado ha cambiado.',
    newTramiteTitle: (name: string) => `Nuevo trámite: «${name}»`,
    newTramiteBody: 'Tu asesoría ha abierto un trámite para ti.',
    firmaTitle: 'Tienes una firma pendiente',
    firmaDueTitle: 'Una firma está a punto de vencer',
    summaryTitle: (count: number) => `Tienes ${count} novedades en Syntia`,
    summaryParts: {
      messages: (n: number) => `${n} ${n === 1 ? 'mensaje' : 'mensajes'}`,
      statuses: (n: number) =>
        `${n} ${n === 1 ? 'cambio de estado' : 'cambios de estado'}`,
      newTramites: (n: number) =>
        `${n} ${n === 1 ? 'trámite nuevo' : 'trámites nuevos'}`,
      firmas: (n: number) => `${n} ${n === 1 ? 'firma' : 'firmas'}`,
    },
  },
} as const
