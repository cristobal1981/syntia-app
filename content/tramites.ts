export const tramites = {
  title: 'Trámites',
  description:
    'Consulta el estado de tus gestiones en curso: tareas del proyecto y tickets de soporte.',
  refreshButton: 'Actualizar',
  refreshing: 'Actualizando…',
  tasks: {
    title: 'Tareas del proyecto',
    description:
      'Gestiones activas en tu proyecto de Odoo vinculadas a tu cuenta.',
    tagFilterNote:
      'Mostramos solo las tareas con la etiqueta configurada para el portal.',
    emptyTitle: 'Sin tareas',
    emptyDescription:
      'No hay tareas en tu proyecto que coincidan con los criterios actuales.',
    columns: {
      name: 'Trámite',
      project: 'Proyecto',
      stage: 'Estado',
      deadline: 'Vencimiento',
    },
  },
  tickets: {
    title: 'Tickets de soporte',
    description: 'Solicitudes y consultas registradas a tu nombre en Odoo.',
    emptyTitle: 'Sin tickets',
    emptyDescription: 'No tienes tickets de soporte abiertos o recientes.',
    columns: {
      name: 'Asunto',
      stage: 'Estado',
      created: 'Fecha',
    },
  },
  states: {
    notLinked: {
      title: 'Cuenta sin vincular',
      description:
        'Tu perfil aún no está vinculado con Odoo. Contacta con tu gestor para activar tus trámites en el portal.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tus trámites',
      description:
        'El servicio de Odoo no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    },
    forbidden: {
      title: 'Sin acceso',
      description: 'Esta sección está disponible solo para clientes del portal.',
    },
  },
} as const
