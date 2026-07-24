export const tramites = {
  title: 'Trámites',
  description:
    'Gestiones generales, consultas de soporte y documentación asociada. Por defecto ves solo lo que está en curso.',
  refreshButton: 'Actualizar',
  refreshing: 'Actualizando…',
  createConsulta: {
    button: 'Nueva consulta',
    creating: 'Creando…',
    drawer: {
      title: 'Nueva consulta',
      description:
        'Describe tu duda o problema. Tu asesoría la recibirá como consulta de soporte.',
      subjectLabel: 'Asunto',
      subjectPlaceholder: 'Ej. Duda sobre el modelo 303…',
      bodyLabel: 'Descripción',
      submit: 'Crear consulta',
      successToast: 'Consulta creada. Tu asesoría te responderá en el trámite.',
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
      forbidden: 'No tienes permiso para crear consultas.',
      not_linked: 'Tu cuenta no está vinculada con Odoo.',
      odoo_unavailable: 'No pudimos crear la consulta. Inténtalo de nuevo.',
      create_failed: 'No pudimos crear la consulta en Odoo.',
      unknown: 'No pudimos crear la consulta. Inténtalo de nuevo.',
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
      consultas: 'Consultas',
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
      'Trámites de proyecto y consultas de soporte en un solo listado.',
    tagFilterNote:
      'Las tareas de proyecto se muestran si están marcadas para Syntia, junto con sus subtareas.',
    emptyTitle: 'Sin trámites',
    emptyDescription: 'No hay trámites en curso en tu cuenta en este momento.',
    columns: {
      name: 'Trámite',
      type: 'Tipo',
      state: 'Estado',
      documents: 'Documentos',
      actions: 'Detalle',
    },
    viewItem: 'Ver detalles',
    newItemBadge: 'Nuevo',
    downloadZip: 'Descargar todo',
    detailNav: {
      previous: 'Anterior de la lista',
      next: 'Siguiente de la lista',
      positionLabel: 'Trámite {current} de {total} en esta página',
    },
    types: {
      tramite: 'Trámite',
      consulta: 'Consulta',
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
        'Tu perfil aún no está vinculado con Odoo. Contacta con tu asesor para activar tus trámites en el portal.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tus trámites',
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
