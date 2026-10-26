export const pushNotifications = {
  title: 'Notificaciones en este dispositivo',
  description:
    'Recibe un aviso del sistema cuando tu asesoría te escriba o haya algo pendiente, aunque no tengas Syntia abierta.',
  enable: 'Activar notificaciones',
  prompt: {
    title: 'No te pierdas ningún aviso de tu asesoría',
    description:
      'Actívalas en este dispositivo y te avisamos al momento, sin abrir Syntia.',
    enable: 'Activar',
    dismiss: 'Ahora no',
    panelHint: 'Recibe estos avisos también fuera de Syntia.',
    installTitle: 'Instala Syntia para recibir avisos',
    understood: 'Entendido',
  },
  types: {
    chatter: 'Mensajes de tu asesoría',
    status: 'Estados de trámites y avisos que requieren tu atención',
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
    statusBodyChangesRequested: 'Tu asesoría necesita algo de ti. Entra para verlo.',
    statusBodyFrom: (previous: string) => `Antes: ${previous}`,
    statusBodyFallback: 'El estado ha cambiado.',
    newTramiteTitle: (name: string) => `Nuevo trámite: «${name}»`,
    newTramiteBody: 'Tu asesoría ha abierto un trámite para ti.',
    firmaTitle: 'Tienes una firma pendiente',
    firmaDueTitle: 'Una firma está a punto de vencer',
    assigneeTitle: (name: string) => `Nuevo responsable en «${name}»`,
    assigneeBody: (assignee: string) => `Ahora te atiende ${assignee}.`,
    summaryTitle: (count: number) => `Tienes ${count} novedades en Syntia`,
    summaryParts: {
      messages: (n: number) => `${n} ${n === 1 ? 'mensaje' : 'mensajes'}`,
      statuses: (n: number) =>
        `${n} ${n === 1 ? 'cambio de estado' : 'cambios de estado'}`,
      newTramites: (n: number) =>
        `${n} ${n === 1 ? 'trámite nuevo' : 'trámites nuevos'}`,
      firmas: (n: number) => `${n} ${n === 1 ? 'firma' : 'firmas'}`,
      assignees: (n: number) =>
        `${n} ${n === 1 ? 'cambio de responsable' : 'cambios de responsable'}`,
    },
  },
} as const
