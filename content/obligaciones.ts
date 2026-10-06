export const obligaciones = {
  title: 'Obligaciones fiscales',
  description:
    'Consulta el estado de tus modelos tributarios por periodo y descarga la documentación asociada.',
  refreshButton: 'Actualizar',
  refreshing: 'Actualizando…',
  yearFallbackLabel: 'Ejercicio fiscal',
  emptyTitle: 'Sin obligaciones registradas',
  emptyDescription:
    'Todavía no hay obligaciones fiscales visibles en tu cuenta. Si acabas de incorporarte, tu asesor las activará pronto.',
  columns: {
    period: 'Periodo',
    name: 'Modelo',
    stage: 'Estado',
    deadline: 'Vencimiento',
    documents: 'Documentos',
  },
  list: {
    viewDocuments: 'Ver documentos',
    downloadZip: 'Descargar todo',
  },
  deadlineStatus: {
    overdue: 'Atrasado',
    dueSoon: 'Vence pronto',
    none: '—',
  },
  search: {
    searchLabel: 'Buscar en obligaciones',
    searchPlaceholder:
      'Buscar por modelo, periodo o concepto (ej. alquiler, IVA)…',
    clearSearch: 'Borrar búsqueda',
    noResultsTitle: 'Sin resultados',
    noResultsDescription:
      'No hay modelos que coincidan con tu búsqueda. Prueba con otro término.',
  },
  urgent: {
    title: 'Qué toca ahora',
    description: 'Lo atrasado y lo que vence en los próximos días, sea del año que sea.',
  },
  pending: {
    title: 'En curso',
    description: 'El resto de modelos en marcha, sin plazo inminente.',
  },
  closed: {
    title: 'Hecho',
    description: 'Modelos ya presentados, agrupados por año.',
    countOne: '1 modelo presentado',
    countMany: '{count} modelos presentados',
  },
  guideLink: '¿Para qué sirve cada modelo?',
  taskStates: {
    inProgress: 'En curso',
    changesRequested: 'Cambios solicitados',
    done: 'Presentado',
    canceled: 'Cancelado',
  },
  viewDetail: 'Ver detalle',
  states: {
    notLinked: {
      title: 'Cuenta sin vincular',
      description:
        'Tu perfil aún no está vinculado con Odoo. Contacta con tu asesor para activar tus obligaciones en el portal.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tus obligaciones',
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
