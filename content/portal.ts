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
  shell: {
    signOutLabel: 'Cerrar sesión',
    dashboardTitle: 'Inicio',
    searchPlaceholder: 'Buscar…',
    sidebarExpandLabel: 'Mostrar menú',
    sidebarCollapseLabel: 'Ocultar menú',
    theme: {
      label: 'Tema',
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
    },
  },
  roles: {
    advisor: 'Gestor Syntia',
    admin: 'Administrador',
    client: 'Cliente',
  } satisfies Record<PortalRole, string>,
  nav: {
    client: [
      { label: 'Inicio', href: '/dashboard', implemented: true, icon: 'home' },
      { label: 'Documentos', href: '/proximamente', implemented: false, icon: 'documents' },
      {
        label: 'Obligaciones',
        href: '/obligaciones',
        implemented: true,
        icon: 'obligations',
      },
      { label: 'Trámites', href: '/tramites', implemented: true, icon: 'procedures' },
      { label: 'Mensajes', href: '/proximamente', implemented: false, icon: 'messages' },
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
            label: 'Gestores',
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
      { label: 'Documentos', href: '/proximamente', implemented: false, icon: 'documents' },
      { label: 'Solicitudes', href: '/proximamente', implemented: false, icon: 'requests' },
      { label: 'Integraciones', href: '/integraciones', implemented: true, icon: 'integrations' },
      { label: 'Configuración', href: '/proximamente', implemented: false, icon: 'settings' },
    ],
    advisor: [
      { label: 'Inicio', href: '/dashboard', implemented: true, icon: 'home' },
      { label: 'Clientes', href: '/clientes', implemented: true, icon: 'clients' },
      { label: 'Tareas', href: '/proximamente', implemented: false, icon: 'tasks' },
      { label: 'Documentos', href: '/proximamente', implemented: false, icon: 'documents' },
    ],
  },
  home: {
    client: {
      greeting: 'Hola,',
      stats: {
        pendingDocs: 'Documentos pendientes',
        activeProcedures: 'Trámites activos',
        unreadMessages: 'Mensajes sin leer',
      },
      deadlinesTitle: 'Próximos vencimientos',
      quickLinksTitle: 'Accesos rápidos',
    },
    admin: {
      greeting: 'Panel de administración',
      teamTitle: 'Gestores',
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
        description: 'ERP, tareas y operaciones de gestoría.',
      },
      google: {
        description: 'Acceso con Google y documentos en Drive.',
      },
      n8n: {
        description: 'Automatizaciones y flujos entre sistemas.',
      },
    },
  },
} as const
