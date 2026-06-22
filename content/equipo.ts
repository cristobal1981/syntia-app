export const equipo = {
  gestores: {
    title: 'Gestores',
    description: 'Personas del equipo que gestionan clientes en el portal.',
    createButton: 'Nuevo gestor',
    countLabel: 'gestores',
    emptyTitle: 'Sin gestores',
    emptyDescription: 'Cuando haya gestores en la base de datos aparecerán aquí.',
    searchPlaceholder: 'Buscar por nombre o correo…',
    columns: {
      name: 'Nombre',
      email: 'Correo',
      role: 'Rol',
      company: 'Empresa',
      status: 'Estado',
    },
  },
  clientes: {
    title: 'Clientes',
    description: 'Empresas y personas con acceso al portal como cliente.',
    createButton: 'Nuevo cliente',
    countLabel: 'clientes',
    emptyTitle: 'Sin clientes',
    emptyDescription: 'No hay clientes que coincidan con tu búsqueda o asignación.',
    searchPlaceholder: 'Buscar por nombre, correo o empresa…',
    viewAll: 'Ver todos',
    columns: {
      name: 'Nombre',
      email: 'Correo',
      company: 'Empresa',
      advisor: 'Gestor',
      status: 'Estado',
    },
  },
  nav: {
    users: 'Usuarios',
    gestores: 'Gestores',
    clientes: 'Clientes',
  },
  status: {
    active: 'Activo',
    invited: 'Invitado',
  },
  roles: {
    advisor: 'Gestor',
    admin: 'Administrador',
  },
  form: {
    editGestor: 'Editar gestor',
    createGestor: 'Nuevo gestor',
    editClient: 'Editar cliente',
    createClient: 'Nuevo cliente',
    save: 'Guardar cambios',
    create: 'Crear cliente',
    createGestorButton: 'Crear gestor',
    creating: 'Creando…',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    successGestor: 'Gestor actualizado.',
    successCreateGestor:
      'Gestor creado. Se ha enviado la invitación por correo.',
    successCreateGestorNoInvite:
      'Gestor creado. No se envió correo de invitación (modo desarrollo).',
    successClient: 'Cliente actualizado.',
    successCreateClient:
      'Cliente creado. Se ha enviado la invitación por correo.',
    successCreateClientNoInvite:
      'Cliente creado. No se envió correo de invitación (modo desarrollo).',
    inviteHint:
      'Se enviará un correo de invitación para que active su acceso al portal.',
    clientKind: {
      title: 'Tipo de cliente',
      options: {
        person: 'Autónomo',
        company: 'Empresa',
      },
    },
    odooImport: {
      title: 'Importar desde Odoo',
      description:
        'Contactos con carpeta Drive en Odoo que aún no están en el portal. Al elegir uno se rellena el formulario con la subcarpeta pública de documentos.',
      searchPlaceholder: 'Buscar por nombre o correo…',
      empty: 'No hay contactos de Odoo disponibles para importar.',
      noResults: 'Ningún contacto coincide con la búsqueda.',
      clearSelection: 'Quitar selección y rellenar manualmente',
      loading: 'Cargando contactos desde Odoo…',
      unavailable:
        'Odoo no está configurado. Puedes crear el cliente rellenando el formulario.',
      error: 'No pudimos cargar los contactos de Odoo. Rellena el formulario manualmente.',
      reviewHint:
        'Datos importados de Odoo. Revisa y corrige lo necesario antes de crear.',
      nameSplit: {
        title: '¿Cómo está el nombre en Odoo?',
        odooLabel: 'En Odoo:',
        hint: 'Elige el formato que encaje; los campos de abajo se actualizan solos.',
        modes: {
          'given-first': 'Nombre · apellidos',
          'surname-first': 'Apellidos · nombre',
          comma: 'Apellidos, nombre',
        },
      },
      corporateEmailHint:
        'En Odoo también figura el correo corporativo {email}. No se guarda en el portal; el acceso usa el correo de contacto.',
      corporateEmailLabel: 'Correo corporativo Odoo',
    },
    accessSection: {
      title: 'Acceso al portal',
      description:
        'Reenvía el enlace de acceso si el cliente no recibió la invitación o no puede entrar. Si ya había accedido, recibirá un enlace para restablecer la contraseña.',
      loginHint:
        'El cliente también puede usar «He olvidado mi contraseña» en la pantalla de inicio de sesión.',
      sendButton: 'Enviar enlace de acceso',
      sending: 'Enviando…',
      success: 'Enlace de acceso enviado por correo.',
      errors: {
        notFound: 'Cliente no encontrado.',
        sendFailed: 'No pudimos enviar el correo. Inténtalo de nuevo.',
      },
    },
    fields: {
      firstName: 'Nombre',
      firstSurname: 'Primer apellido',
      secondSurname: 'Segundo apellido',
      email: 'Correo electrónico',
      contactEmail: 'Correo de contacto',
      contactEmailHint:
        'Para invitaciones al portal, nóminas y comunicaciones con el cliente.',
      companyLegalName: 'Razón social',
      companyCommercialName: 'Nombre comercial',
      companyCommercialNameHint: 'Opcional. Nombre con el que opera el negocio.',
      phone: 'Teléfono',
      company: 'Empresa',
      role: 'Rol',
      status: 'Estado',
      advisor: 'Gestor asignado',
      odooPartnerId: 'ID Odoo',
      odooPartnerIdHint: 'Para vincular tareas y tickets en Odoo.',
      driveFolderId: 'ID carpeta Drive',
      driveFolderIdHint:
        'ID de la subcarpeta pública de documentos (no la carpeta padre de Odoo). Solo visible en este formulario.',
      unassigned: 'Sin asignar',
    },
    errors: {
      unknown: 'No pudimos guardar los cambios. Inténtalo de nuevo.',
      forbidden: 'No tienes permiso para editar este registro.',
      duplicateEmail: 'Ya existe un usuario con ese correo.',
      validation: 'Revisa los campos obligatorios marcados con *.',
    },
    dangerZone: {
      title: 'Zona peligrosa',
      description:
        'Eliminar al cliente borra su acceso al portal, su perfil y la cuenta de inicio de sesión. Los datos en Odoo no se eliminan.',
      deleteButton: 'Eliminar cliente',
      confirmTitle: '¿Eliminar este cliente?',
      confirmDescription:
        'Esta acción no se puede deshacer. Se borrarán la cuenta del portal, el perfil y el acceso por correo.',
      confirmEmailLabel: 'Escribe el correo del cliente para confirmar',
      confirmPlaceholder: 'correo@ejemplo.com',
      copyEmail: 'Copiar correo',
      copyEmailSuccess: 'Correo copiado.',
      confirmDelete: 'Eliminar definitivamente',
      deleting: 'Eliminando…',
      successDelete: 'Cliente eliminado.',
      errors: {
        deleteFailed: 'No pudimos eliminar al cliente. Inténtalo de nuevo.',
        notFound: 'Cliente no encontrado.',
        copyEmailFailed: 'No pudimos copiar el correo. Selecciónalo y cópialo manualmente.',
      },
    },
    gestorDangerZone: {
      title: 'Zona peligrosa',
      description:
        'Eliminar al gestor borra su acceso al portal, su perfil y la cuenta de inicio de sesión.',
      deleteButton: 'Eliminar gestor',
      confirmTitle: '¿Eliminar este gestor?',
      confirmDescription:
        'Esta acción no se puede deshacer. Se borrarán la cuenta del portal, el perfil y el acceso por correo.',
      confirmEmailLabel: 'Escribe el correo del gestor para confirmar',
      confirmPlaceholder: 'correo@ejemplo.com',
      copyEmail: 'Copiar correo',
      copyEmailSuccess: 'Correo copiado.',
      confirmDelete: 'Eliminar definitivamente',
      deleting: 'Eliminando…',
      successDelete: 'Gestor eliminado.',
      errors: {
        deleteFailed: 'No pudimos eliminar al gestor. Inténtalo de nuevo.',
        notFound: 'Gestor no encontrado.',
        copyEmailFailed: 'No pudimos copiar el correo. Selecciónalo y cópialo manualmente.',
      },
    },
  },
} as const
