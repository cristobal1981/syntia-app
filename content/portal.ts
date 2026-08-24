import type { PortalRole } from '@/src/modules/auth/domain/types'

export const portal = {
  login: {
    title: 'Acceso a la plataforma',
    description:
      'Tu espacio seguro para documentos, trámites y comunicación con tu asesoría.',
    emailLabel: 'Correo electrónico',
    passwordLabel: 'Contraseña',
    submitLabel: 'Entrar',
    googleLabel: 'Continuar con Google',
    orDivider: 'o',
    forgotPasswordLabel: '¿Olvidaste tu contraseña?',
    showPasswordLabel: 'Mostrar contraseña',
    hidePasswordLabel: 'Ocultar contraseña',
    backToSiteLabel: 'Volver al sitio',
    errors: {
      invalid_credentials: 'Correo o contraseña incorrectos.',
      not_configured:
        'El acceso al portal requiere Supabase. Configura las variables de entorno.',
      unknown: 'No pudimos iniciar sesión. Inténtalo de nuevo.',
      oauth_not_configured:
        'El acceso con Google aún no está configurado. Contacta con tu administrador.',
      oauth_failed: 'No pudimos conectar con Google. Inténtalo de nuevo.',
      auth_callback: 'No pudimos completar el acceso. Vuelve a intentarlo.',
    },
  },
  recovery: {
    title: 'Recuperar contraseña',
    description:
      'Te enviaremos un enlace seguro a tu correo para restablecer el acceso.',
    emailLabel: 'Correo electrónico',
    submitLabel: 'Enviar enlace',
    backToLoginLabel: 'Volver al inicio de sesión',
    successMessage:
      'Si existe una cuenta con ese correo, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.',
    errors: {
      not_configured:
        'La recuperación requiere Supabase, Resend y SUPABASE_SERVICE_ROLE_KEY configurados.',
      invalid_email: 'Introduce un correo electrónico válido.',
      unknown: 'No pudimos enviar el enlace. Inténtalo de nuevo.',
    },
  },
  reset: {
    title: 'Nueva contraseña',
    description: 'Elige una contraseña segura para volver a acceder a tu cuenta.',
    passwordLabel: 'Nueva contraseña',
    passwordRequirements: {
      intro: 'La nueva contraseña debe contener:',
      minLength: 'Al menos 8 caracteres',
      uppercase: 'Una letra mayúscula',
      lowercase: 'Una letra minúscula',
      digit: 'Un número',
      symbol: 'Un símbolo (!, @, #…)',
    },
    confirmPasswordLabel: 'Confirmar contraseña',
    submitLabel: 'Guardar contraseña',
    backToLoginLabel: 'Volver al inicio de sesión',
    requestNewLinkLabel: 'Solicitar un nuevo enlace',
    verifyingLink: 'Verificando enlace…',
    unavailable: {
      eyebrow: 'Restablecer contraseña',
      title: 'Este enlace no está disponible',
      description:
        'El enlace que has abierto no es válido, ha caducado o ya no está activo.',
      ctaLabel: 'Solicitar un nuevo enlace',
    },
    errors: {
      not_configured:
        'El restablecimiento requiere Supabase. Configura las variables de entorno.',
      invalid_link: 'Este enlace no es válido o ha caducado.',
      weak_password:
        'La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula, número y símbolo.',
      weak_password_short: 'Usa al menos 8 caracteres.',
      weak_password_uppercase: 'Incluye al menos una letra mayúscula.',
      weak_password_lowercase: 'Incluye al menos una letra minúscula.',
      weak_password_digit: 'Incluye al menos un número.',
      weak_password_symbol: 'Incluye al menos un símbolo.',
      mismatch: 'Las contraseñas no coinciden.',
      same_password: 'La nueva contraseña debe ser distinta a la actual.',
      unknown: 'No pudimos actualizar la contraseña. Inténtalo de nuevo.',
    },
  },
  search: {
    suggestionsTitle: 'Ir a',
    resultsTitle: 'Resultados',
    actionsTitle: 'Buscar en',
    emptyTitle: 'Sin resultados',
    emptyDescription:
      'Prueba con otra palabra o navega desde el menú lateral.',
    dialogTitle: 'Buscar en el portal',
    dialogDescription:
      'Escribe para buscar páginas y acciones del portal.',
    actionCreateConsulta: 'Nueva consulta',
    actions: {
      tramites: 'Buscar trámites: «{query}»',
      obligaciones: 'Buscar obligaciones: «{query}»',
    },
    extras: {
      client: [
        {
          id: 'extra:guias',
          label: 'Guías',
          description: 'Guías prácticas y plazos fiscales',
          href: '/guias',
          icon: 'guides' as const,
          keywords: ['guías', 'guias', 'plazos', 'calendario fiscal', 'ayuda'],
        },
        {
          id: 'extra:guia-modelos',
          label: 'Guía de modelos tributarios',
          description: 'Para qué sirve cada modelo fiscal',
          href: '/guias/modelos-aeat',
          icon: 'guides' as const,
          keywords: ['modelos', 'iva', 'irpf', 'guía', 'fiscal', 'tributario'],
        },
      ],
      worker: [
        {
          id: 'extra:guias',
          label: 'Guías',
          description: 'Guías prácticas y plazos fiscales',
          href: '/guias',
          icon: 'guides' as const,
          keywords: ['guías', 'guias', 'plazos', 'calendario fiscal', 'ayuda'],
        },
      ],
      admin: [],
      advisor: [],
    },
  },
  shell: {
    signOutLabel: 'Cerrar sesión',
    dashboardTitle: 'Inicio',
    searchPlaceholder: 'Buscar…',
    sidebarExpandLabel: 'Mostrar menú',
    sidebarCollapseLabel: 'Ocultar menú',
    mobileNavOpenLabel: 'Abrir menú',
    mobileNavCloseLabel: 'Cerrar menú',
    theme: {
      label: 'Tema',
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
      currentPrefix: 'Tema:',
      switchToPrefix: 'Cambiar a',
    },
    accessibility: {
      label: 'Opciones de accesibilidad',
      title: 'Accesibilidad',
      fontSize: {
        label: 'Tamaño del texto',
        options: {
          sm: 'Pequeño',
          md: 'Normal',
          lg: 'Grande',
          xl: 'Muy grande',
        },
      },
      highContrast: 'Alto contraste',
      underlineLinks: 'Subrayar enlaces',
    },
    reportProblem: {
      label: 'Reportar un problema',
      title: 'Reportar un problema',
      description:
        'Cuéntanos qué no está funcionando. Cuanto más contexto nos des, antes lo solucionaremos.',
      areaLabel: 'Apartado afectado',
      areaPlaceholder: 'Selecciona un apartado',
      areas: {
        inicio: 'Inicio',
        obligaciones: 'Obligaciones',
        tramites: 'Trámites',
        documentos: 'Documentos',
        firmas: 'Firmas',
        guias: 'Guías',
        perfil: 'Perfil',
        otro: 'Otro / no lo sé',
      },
      problemLabel: 'Descripción del problema',
      problemPlaceholder: 'Qué esperabas que pasara y qué pasó en realidad…',
      stepsLabel: 'Pasos para reproducirlo (opcional)',
      stepsHelp: 'Ej. 1. Entro en Trámites 2. Busco "303" 3. No aparece nada…',
      errorLabel: 'Error mostrado, si lo hubo (opcional)',
      errorHelp: 'Copia aquí el mensaje de error tal cual lo viste.',
      submit: 'Enviar reporte',
      creating: 'Enviando…',
      successToast: 'Gracias por reportar el problema. Lo revisaremos en breve.',
      cancel: 'Cancelar',
      unsavedTitle: '¿Descartar el reporte?',
      unsavedDescription:
        'Tienes cambios sin enviar. Si cierras ahora, se perderá lo que has escrito.',
      discard: 'Descartar',
      keepEditing: 'Seguir editando',
      errors: {
        areaRequired: 'Selecciona el apartado afectado.',
        problemRequired: 'La descripción es obligatoria.',
        problemTooLong: 'La descripción no puede superar 2000 caracteres.',
        stepsTooLong: 'Los pasos no pueden superar 1000 caracteres.',
        errorShownTooLong: 'El error no puede superar 1000 caracteres.',
        forbidden: 'No tienes permiso para reportar problemas.',
        odoo_unavailable: 'No pudimos enviar tu reporte. Inténtalo de nuevo.',
        create_failed:
          'No pudimos enviar tu reporte. Inténtalo de nuevo o contacta con tu asesor.',
        unknown: 'No pudimos enviar tu reporte. Inténtalo de nuevo.',
      },
    },
  },
  onboardingChecklist: {
    title: 'Primeros pasos',
    progressLabel: '{completed} de {total}',
    dismiss: 'Listo',
    reopenLabel: 'Ver primeros pasos de nuevo',
    tipDismissLabel: 'Cerrar aviso',
    steps: {
      tramites: {
        title: 'Trámites',
        description:
          'Aquí sigues cada trámite y consulta que gestionamos por ti, con su estado siempre actualizado.',
      },
      firmas: {
        title: 'Firmas',
        description: 'Si te llega una solicitud de firma, la encontrarás aquí.',
      },
      guias: {
        title: 'Guías',
        description:
          'Si tienes dudas sobre modelos o plazos fiscales, consulta las guías antes de preguntar.',
      },
      buscador: {
        title: 'Buscador',
        description:
          'Busca cualquier trámite, documento o guía desde aquí, en cualquier momento.',
      },
      nuevaConsulta: {
        title: 'Nueva consulta',
        description:
          '¿No encuentras la respuesta? Envía una consulta directa a tu asesor asignado.',
      },
    },
  },
  authLoading: {
    signOutMessage: '¡Hasta pronto! Vuelve cuando quieras.',
    signOutMinDisplayMs: 500,
    entryMinDisplayMs: 2000,
    entryPhrases: [
      'Preparando su portal personalizado',
      'Cargando tus trámites y documentos',
      'Sincronizando tu espacio de trabajo',
      'Casi listo…',
    ],
  },
  odoo: {
    rateLimited: {
      title: 'Demanda elevada',
      description:
        'El servidor está recibiendo mucha demanda en este momento. Vuelve a intentarlo en unos minutos.',
    },
    inlineMessage:
      'El servidor está recibiendo mucha demanda. Vuelve a intentarlo en unos minutos.',
  },
  notifications: {
    label: 'Notificaciones',
    emptyTitle: 'Sin novedades',
    emptyDescription:
      'Cuando haya novedades en tus trámites, consultas, obligaciones o firmas, lo verás aquí.',
    openConversation: 'Ver conversación',
    openDocuments: 'Ver documentos',
    openFirmas: 'Ver firmas',
    unreadBadge: 'Mensajes sin leer',
    tooltipUnread: '{count} novedades',
    typeTramite: 'Trámite',
    typeConsulta: 'Consulta',
    typeNewTramite: 'Nuevo trámite',
    typeUnreadMessage: 'Mensaje sin leer',
    typeStatusChange: 'Cambio de estado',
    typeStatusClosed: 'Trámite cerrado',
    typeNewDocument: 'Nuevo documento',
    typeNewFirma: 'Nueva firma pendiente',
  },
  confirm: {
    cancel: 'Cancelar',
    confirm: 'Confirmar',
  },
  shortcuts: {
    overlayHint: 'Mantén {modifier} · Pulsa la tecla resaltada en cada botón',
    refresh: {
      label: 'Alt+R',
      buttonHintIdle: '{action}. Mantén {modifier} para ver atajos.',
      buttonHintActive: '{action} ({shortcut})',
      description:
        'Actualiza los datos de esta página sin recargarla por completo.',
    },
    createConsulta: {
      label: 'Alt+N',
      buttonHintIdle: '{action}. Mantén {modifier} para ver atajos.',
      buttonHintActive: '{action} ({shortcut})',
    },
  },
  roles: {
    advisor: 'Asesor Syntia',
    admin: 'Administrador',
    client: 'Cliente',
    worker: 'Colaborador',
  } satisfies Record<PortalRole, string>,
  nav: {
    client: [
      { label: 'Inicio', href: '/dashboard', implemented: true, icon: 'home' },
      {
        label: 'Obligaciones',
        href: '/obligaciones',
        implemented: true,
        icon: 'obligations',
      },
      { label: 'Trámites', href: '/tramites', implemented: true, icon: 'procedures' },
      { label: 'Documentos', href: '/documentos', implemented: true, icon: 'documents' },
      { label: 'Firmas', href: '/firmas', implemented: true, icon: 'signatures' },
      { label: 'Guías', href: '/guias', implemented: true, icon: 'guides' },
      { label: 'Perfil', href: '/perfil', implemented: true, icon: 'profile' },
    ],
    worker: [
      { label: 'Inicio', href: '/dashboard', implemented: true, icon: 'home' },
      {
        label: 'Obligaciones',
        href: '/obligaciones',
        implemented: true,
        icon: 'obligations',
      },
      { label: 'Trámites', href: '/tramites', implemented: true, icon: 'procedures' },
      { label: 'Documentos', href: '/documentos', implemented: true, icon: 'documents' },
      { label: 'Firmas', href: '/firmas', implemented: true, icon: 'signatures' },
      { label: 'Guías', href: '/guias', implemented: true, icon: 'guides' },
    ],
    admin: [
      { label: 'Inicio', href: '/dashboard', implemented: true, icon: 'home' },
      {
        label: 'Usuarios',
        implemented: true,
        icon: 'team',
        children: [
          {
            label: 'Asesores',
            href: '/equipo/gestores',
            implemented: true,
            icon: 'team',
          },
          {
            label: 'Clientes',
            href: '/equipo/clientes',
            implemented: true,
            icon: 'clients',
          },
        ],
      },
      { label: 'Solicitudes', href: '/solicitudes', implemented: true, icon: 'requests' },
      {
        label: 'Automatizaciones',
        href: '/automatizaciones',
        implemented: true,
        icon: 'automations',
      },
      { label: 'Integraciones', href: '/integraciones', implemented: true, icon: 'integrations' },
      { label: 'Configuración', href: '/proximamente', implemented: false, icon: 'settings' },
    ],
    advisor: [
      { label: 'Inicio', href: '/dashboard', implemented: true, icon: 'home' },
      { label: 'Clientes', href: '/clientes', implemented: true, icon: 'clients' },
      {
        label: 'Automatizaciones',
        href: '/automatizaciones',
        implemented: true,
        icon: 'automations',
      },
      { label: 'Tareas', href: '/proximamente', implemented: false, icon: 'tasks' },
    ],
  },
  home: {
    client: {
      greeting: 'Hola,',
      statsTitle: 'Resumen',
      stats: {
        activeTramitesAndConsultas: 'Trámites y consultas activos',
        obligacionesInProgress: 'Obligaciones en curso',
        pendingSignatures: 'Solicitudes de firma',
      },
      headline: {
        deadlineOne: '{name}, con plazo el {date}',
        signaturesOne: 'Tienes una firma pendiente',
        signaturesMany: 'Tienes {count} firmas pendientes',
        obligacionesOne: 'Tienes una obligación en curso',
        obligacionesMany: 'Tienes {count} obligaciones en curso',
        tramitesOne: 'Tienes un trámite o consulta activo',
        tramitesMany: 'Tienes {count} trámites y consultas activos',
        allClear: 'Todo al día. No tienes trámites, obligaciones ni firmas pendientes.',
        deadlineLabel: 'Tu próximo plazo',
      },
      unreadLoading: 'Comprobando novedades…',
      unreadTitle: 'Novedades',
      unreadEmpty: 'No hay novedades de tu asesoría por ahora. Todo está al día — cualquier cosa, aquí estamos para ayudarte.',
 
      unreadViewAll: 'Ver trámites',
      unreadMore: 'Ver {count} novedades más',
      unreadMorePending:
        'Tienes {count} notificaciones más pendientes. Ábrelas desde la campana del menú.',
      statsUnavailable:
        'No pudimos cargar el resumen ahora mismo. Puedes seguir usando el menú lateral.',
      statsRateLimited:
        'El servidor está recibiendo mucha demanda y no pudimos cargar el resumen. Vuelve a intentarlo en unos minutos.',
      quickLinksTitle: 'Accesos rápidos',
    },
    solicitudesStats: {
      total: 'Pendientes',
      empty: 'Sin solicitudes pendientes',
      clicked: 'Clicadas',
      received: 'Recibidas',
      failed: 'Fallidas',
    },
    admin: {
      greeting: 'Panel de administración',
      clientsStat: 'Clientes',
      advisorsStat: 'Asesores',
      teamTitle: 'Asesores',
      viewTeamLink: 'Ver todos',
      requestsTitle: 'Solicitudes abiertas',
      integrationsTitle: 'Integraciones',
    },
    advisor: {
      greeting: 'Buenos días,',
      requestsTitle: 'Solicitudes abiertas',
      clientsStat: 'Clientes asignados',
      clientsTitle: 'Clientes recientes',
      queueTitle: 'Cola de automatización',
      integrationsTitle: 'Integraciones',
    },
  },
  integrations: {
    title: 'Integraciones',
    description:
      'Estado de conexión con los servicios que alimentan el portal. Odoo y n8n se comprueban en tiempo real.',
    refreshLabel: 'Comprobar conexión',
    refreshingLabel: 'Comprobando…',
    summaryConnected: 'conectadas',
    summaryPending: 'pendientes',
    summaryError: 'con errores',
    items: {
      odoo: {
        description: 'ERP, tareas y operaciones de asesoría.',
      },
      google: {
        description: 'Acceso con Google y documentos en Drive.',
      },
      n8n: {
        description: 'Automatizaciones y flujos entre sistemas.',
      },
    },
  },
  pagination: {
    previous: 'Anterior',
    next: 'Siguiente',
    pageLabel: 'Página',
    ofLabel: 'de',
  },
} as const
