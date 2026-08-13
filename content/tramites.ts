export const tramites = {
  title: 'Tus trámites',
  description:
    'Gestiones generales, consultas de soporte y documentación asociada. Por defecto ves solo lo que sigue abierto.',
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
      not_linked: 'Tu cuenta no está vinculada. Contacta con tu asesor para activarla.',
      odoo_unavailable: 'No pudimos crear la consulta. Inténtalo de nuevo.',
      create_failed: 'No pudimos crear la consulta. Inténtalo de nuevo o contacta con tu asesor.',
      unknown: 'No pudimos crear la consulta. Inténtalo de nuevo.',
    },
  },
  pagination: {
    previous: 'Anterior',
    next: 'Siguiente',
    pageLabel: 'Página',
    ofLabel: 'de',
  },
  activity: {
    extraCount: '+{count} más',
  },
  filters: {
    searchLabel: 'Buscar trámites',
    searchPlaceholder: 'Buscar por nombre…',
    includeClosed: 'Incluir cerrados',
    includeClosedHint:
      'En «Todos» muestra abiertos y cerrados. Con otros filtros activos, marca Hecho y Cancelado.',
    typeLabel: 'Tipo',
    stateLabel: 'Estado',
    clearFilters: 'Limpiar filtros',
    views: {
      tramites: 'Trámites',
      consultas: 'Consultas',
      done: 'Hecho',
      canceled: 'Cancelado',
      withDocuments: 'Con documentos',
    },
    noResultsTitle: 'Sin resultados',
    noResultsDescription:
      'No hay trámites que coincidan con los filtros actuales. Prueba otra búsqueda, cambia el filtro o activa «Incluir cerrados».',
  },
  list: {
    emptyTitle: 'Sin trámites',
    emptyDescription: 'No hay trámites en curso en tu cuenta en este momento.',
    columns: {
      name: 'Trámite',
      tags: 'Etiquetas',
      documents: 'adjuntos',
    },
    downloadZip: 'Descargar todo',
    detailNav: {
      previous: 'Anterior de la lista',
      next: 'Siguiente de la lista',
      previousHint: 'Trámite anterior',
      nextHint: 'Trámite siguiente',
      buttonHintIdle: '{action}. Mantén {modifier} para ver atajos.',
      buttonHintActive: '{action} ({shortcut})',
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
        'Tu perfil aún no está vinculado. Contacta con tu asesor para activar tus trámites en el portal.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tus trámites',
      description:
        'El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
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
