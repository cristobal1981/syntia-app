export const obligaciones = {
  title: 'Obligaciones fiscales',
  description:
    'Consulta el estado de tus modelos tributarios por periodo y descarga la documentación asociada.',
  refreshButton: 'Actualizar',
  refreshing: 'Actualizando…',
  yearFallbackLabel: 'Ejercicio fiscal',
  periodEmptyTitle: 'Sin modelos en este periodo',
  periodEmptyDescription:
    'Aún no hay modelos registrados para este periodo. Tu asesor los irá añadiendo según el calendario fiscal.',
  emptyTitle: 'Sin obligaciones registradas',
  emptyDescription:
    'Todavía no hay obligaciones fiscales visibles en tu cuenta. Si acabas de incorporarte, tu asesor las activará pronto.',
  columns: {
    period: 'Periodo',
    name: 'Modelo',
    stage: 'Estado',
    deadline: 'Vencimiento',
    documents: 'Documentos',
    actions: 'Acciones',
  },
  list: {
    viewDocuments: 'Ver documentos',
    downloadZip: 'Descargar todo',
  },
  filters: {
    searchLabel: 'Buscar en obligaciones',
    searchPlaceholder:
      'Buscar por modelo, periodo o concepto (ej. alquiler, IVA)…',
    chipGroupLabel: 'Filtrar por modelo',
    noResultsTitle: 'Sin resultados',
    noResultsDescription:
      'No hay modelos que coincidan con tu búsqueda. Prueba con otro término.',
  },
  guideLink: '¿Para qué sirve cada modelo?',
  taskStates: {
    inProgress: 'En curso',
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
