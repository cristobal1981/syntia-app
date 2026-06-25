export const tramites = {
  title: 'Trámites',
  description:
    'Gestiones generales, incidencias de soporte y documentación asociada. Por defecto ves solo lo que está en curso.',
  refreshButton: 'Actualizar',
  refreshing: 'Actualizando…',
  createIncidencia: {
    button: 'Nueva incidencia',
    creating: 'Creando…',
    drawer: {
      title: 'Nueva incidencia',
      description:
        'Describe tu consulta o problema. Tu gestoría la recibirá como incidencia de soporte.',
      subjectLabel: 'Asunto',
      subjectPlaceholder: 'Ej. Duda sobre el modelo 303…',
      bodyLabel: 'Descripción',
      submit: 'Crear incidencia',
      cancel: 'Cancelar',
      unsavedTitle: '¿Descartar cambios?',
      unsavedDescription:
        'Tienes cambios sin guardar. Si cierras ahora, se perderá lo que has escrito.',
      discard: 'Descartar',
      keepEditing: 'Seguir editando',
    },
    errors: {
      subjectRequired: 'El asunto es obligatorio.',
      subjectTooLong: 'El asunto no puede superar 120 caracteres.',
      bodyRequired: 'La descripción es obligatoria.',
      bodyTooLong: 'La descripción no puede superar 2000 caracteres.',
      forbidden: 'No tienes permiso para crear incidencias.',
      not_linked: 'Tu cuenta no está vinculada con Odoo.',
      odoo_unavailable: 'No pudimos crear la incidencia. Inténtalo de nuevo.',
      create_failed: 'No pudimos crear la incidencia en Odoo.',
      unknown: 'No pudimos crear la incidencia. Inténtalo de nuevo.',
    },
  },
  pagination: {
    previous: 'Anterior',
    next: 'Siguiente',
    pageLabel: 'Página',
    ofLabel: 'de',
  },
  filters: {
    searchLabel: 'Buscar trámites',
    searchPlaceholder: 'Buscar por nombre…',
    includeClosed: 'Incluir cerrados',
    includeClosedHint:
      'En «Todos» muestra abiertos y cerrados. Con otros filtros activos, marca Hecho y Cancelado.',
    views: {
      label: 'Filtrar trámites',
      all: 'Todos',
      tramites: 'Trámites',
      incidencias: 'Incidencias',
      inProgress: 'En curso',
      done: 'Hecho',
      canceled: 'Cancelado',
      withDocuments: 'Con documentos',
    },
    noResultsTitle: 'Sin resultados',
    noResultsDescription:
      'No hay trámites que coincidan con los filtros actuales. Prueba otra búsqueda, cambia el filtro o activa «Incluir cerrados».',
  },
  list: {
    title: 'Tus trámites',
    description:
      'Trámites de proyecto e incidencias de soporte en un solo listado.',
    tagFilterNote:
      'Las tareas de proyecto se filtran por la etiqueta configurada en Odoo.',
    emptyTitle: 'Sin trámites',
    emptyDescription: 'No hay trámites en curso en tu cuenta en este momento.',
    columns: {
      name: 'Trámite',
      type: 'Tipo',
      state: 'Estado',
      documents: 'Documentos',
      actions: 'Detalle',
    },
    viewItem: 'Ver trámite',
    downloadZip: 'Descargar todo',
    types: {
      tramite: 'Trámite',
      incidencia: 'Incidencia',
    },
  },
  tasks: {
    downloadZip: 'Descargar todo',
  },
  taskStates: {
    inProgress: 'En curso',
    changesRequested: 'Cambios solicitados',
    approved: 'Aprobado',
    waiting: 'En espera',
    done: 'Hecho',
    canceled: 'Cancelado',
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
