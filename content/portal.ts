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
        'La recuperación de contraseña requiere Supabase. Configura las variables de entorno.',
      invalid_email: 'Introduce un correo electrónico válido.',
      unknown: 'No pudimos enviar el enlace. Inténtalo de nuevo.',
    },
  },
  reset: {
    title: 'Nueva contraseña',
    description: 'Elige una contraseña segura para volver a acceder a tu cuenta.',
    passwordLabel: 'Nueva contraseña',
    confirmPasswordLabel: 'Confirmar contraseña',
    submitLabel: 'Guardar contraseña',
    backToLoginLabel: 'Volver al inicio de sesión',
    requestNewLinkLabel: 'Solicitar un nuevo enlace',
    verifyingLink: 'Verificando enlace…',
    errors: {
      not_configured:
        'El restablecimiento requiere Supabase. Configura las variables de entorno.',
      invalid_link: 'Este enlace no es válido o ha caducado.',
      weak_password: 'La contraseña debe tener al menos 8 caracteres.',
      mismatch: 'Las contraseñas no coinciden.',
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
          id: 'extra:guia-modelos',
          label: 'Guía de modelos tributarios',
          description: 'Para qué sirve cada modelo fiscal',
          href: '/obligaciones/guia-modelos',
          icon: 'obligations' as const,
          keywords: ['modelos', 'iva', 'irpf', 'guía', 'fiscal', 'tributario'],
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
    },
  },
  authLoading: {
    signOutMessage: '¡Hasta pronto! Vuelve cuando quieras.',
    signOutMinDisplayMs: 1500,
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
      { label: 'Firmas', href: '/firmas', implemented: true, icon: 'signatures' },
      { label: 'Perfil', href: '/perfil', implemented: true, icon: 'profile' },
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
    admin: {
      greeting: 'Panel de administración',
      teamTitle: 'Asesores',
      viewTeamLink: 'Ver todos',
      requestsTitle: 'Solicitudes abiertas',
      integrationsTitle: 'Integraciones',
    },
    advisor: {
      greeting: 'Buenos días,',
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
