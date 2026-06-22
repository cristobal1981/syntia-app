export const obligaciones = {
  title: 'Obligaciones fiscales',
  description:
    'Consulta el estado de tus modelos tributarios por periodo y descarga la documentación asociada.',
  refreshButton: 'Actualizar',
  refreshing: 'Actualizando…',
  yearFallbackLabel: 'Ejercicio fiscal',
  periodEmptyTitle: 'Sin modelos en este periodo',
  periodEmptyDescription:
    'Aún no hay modelos registrados para este periodo. Tu gestor los irá añadiendo según el calendario fiscal.',
  emptyTitle: 'Sin obligaciones registradas',
  emptyDescription:
    'Todavía no hay obligaciones fiscales visibles en tu cuenta. Si acabas de incorporarte, tu gestor las activará pronto.',
  columns: {
    name: 'Modelo',
    stage: 'Estado',
    deadline: 'Vencimiento',
    documents: 'Documentos',
  },
  viewDetail: 'Ver detalle',
  states: {
    notLinked: {
      title: 'Cuenta sin vincular',
      description:
        'Tu perfil aún no está vinculado con Odoo. Contacta con tu gestor para activar tus obligaciones en el portal.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tus obligaciones',
      description:
        'El servicio de Odoo no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    },
    forbidden: {
      title: 'Sin acceso',
      description: 'Esta sección está disponible solo para clientes del portal.',
    },
  },
} as const
