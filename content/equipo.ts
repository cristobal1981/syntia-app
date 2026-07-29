export const equipo = {
  gestores: {
    title: 'Asesores',
    description: 'Personas del equipo que gestionan clientes en el portal.',
    createButton: 'Nuevo asesor',
    countLabel: 'asesores',
    emptyTitle: 'Sin asesores',
    emptyDescription: 'Cuando haya asesores en la base de datos aparecerán aquí.',
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
      advisor: 'Asesor',
      status: 'Estado',
    },
  },
  nav: {
    users: 'Usuarios',
    gestores: 'Asesores',
    clientes: 'Clientes',
  },
  status: {
    active: 'Activo',
    invited: 'Invitado',
  },
  roles: {
    advisor: 'Asesor',
    admin: 'Administrador',
  },
  form: {
    editGestor: 'Editar asesor',
    createGestor: 'Nuevo asesor',
    editClient: 'Editar cliente',
    createClient: 'Nuevo cliente',
    save: 'Guardar cambios',
    create: 'Crear cliente',
    createGestorButton: 'Crear asesor',
    creating: 'Creando…',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    successGestor: 'Asesor actualizado.',
    successCreateGestor:
      'Asesor creado. Se ha enviado la invitación por correo.',
    successCreateGestorNoInvite:
      'Asesor creado. No se envió correo de invitación (modo desarrollo).',
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
    gestorOdooImport: {
      title: 'Importar desde Odoo',
      description:
        'Usuarios internos de Odoo (no de portal/clientes) que aún no están vinculados a ningún asesor. Al elegir uno se rellena el formulario.',
      searchPlaceholder: 'Buscar por nombre o correo…',
      empty: 'No hay usuarios de Odoo disponibles para importar.',
      noResults: 'Ningún usuario coincide con la búsqueda.',
      clearSelection: 'Quitar selección y rellenar manualmente',
      loading: 'Cargando usuarios desde Odoo…',
      unavailable:
        'Odoo no está configurado. Puedes crear el asesor rellenando el formulario.',
      error: 'No pudimos cargar los usuarios de Odoo. Rellena el formulario manualmente.',
      reviewHint:
        'Datos importados de Odoo. Revisa y corrige lo necesario antes de crear.',
    },
    accessSection: {
      title: 'Acceso al portal',
      description:
        'Reenvía la invitación si el cliente no la recibió o no puede entrar. Si ya había verificado su cuenta, puedes forzar un cambio de contraseña.',
      loginHint:
        'El cliente también puede usar «He olvidado mi contraseña» en la pantalla de inicio de sesión.',
      sendButton: 'Reenviar invitación',
      sending: 'Enviando…',
      success: 'Invitación reenviada por correo.',
      resetButton: 'Restablecer contraseña',
      resetting: 'Restableciendo…',
      resetSuccess:
        'Se ha enviado un correo para crear una nueva contraseña. La contraseña actual y las sesiones activas del cliente han quedado invalidadas.',
      resetConfirmTitle: '¿Restablecer la contraseña de este cliente?',
      resetConfirmDescription:
        'Se invalidará su contraseña actual y se cerrarán sus sesiones activas. Recibirá un correo para crear una nueva. Úsalo solo si ha perdido el acceso o detectas actividad sospechosa en su cuenta.',
      resetConfirmButton: 'Restablecer y cerrar sesión',
      errors: {
        notFound: 'Cliente no encontrado.',
        sendFailed: 'No pudimos enviar el correo. Inténtalo de nuevo.',
      },
    },
    gestorAccessSection: {
      title: 'Acceso al portal',
      description:
        'Reenvía la invitación si el asesor no la recibió o no puede entrar. Si ya había verificado su cuenta, puedes forzar un cambio de contraseña.',
      loginHint:
        'El asesor también puede usar «He olvidado mi contraseña» en la pantalla de inicio de sesión.',
      sendButton: 'Reenviar invitación',
      sending: 'Enviando…',
      success: 'Invitación reenviada por correo.',
      resetButton: 'Restablecer contraseña',
      resetting: 'Restableciendo…',
      resetSuccess:
        'Se ha enviado un correo para crear una nueva contraseña. La contraseña actual y las sesiones activas del asesor han quedado invalidadas.',
      resetConfirmTitle: '¿Restablecer la contraseña de este asesor?',
      resetConfirmDescription:
        'Se invalidará su contraseña actual y se cerrarán sus sesiones activas. Recibirá un correo para crear una nueva. Úsalo solo si ha perdido el acceso o detectas actividad sospechosa en su cuenta.',
      resetConfirmButton: 'Restablecer y cerrar sesión',
      errors: {
        notFound: 'Asesor no encontrado.',
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
      advisor: 'Asesor asignado',
      odooPartnerId: 'ID Odoo',
      odooPartnerIdHint: 'Para vincular tareas y tickets en Odoo.',
      driveFolderId: 'ID carpeta Drive',
      driveFolderIdHint:
        'ID de la subcarpeta pública de documentos (no la carpeta padre de Odoo). Solo visible en este formulario.',
      unassigned: 'Sin asignar',
      odooUserId: 'ID usuario Odoo',
      odooUserIdHint: 'res.users.id del asesor en Odoo.',
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
        'Eliminar al asesor borra su acceso al portal, su perfil y la cuenta de inicio de sesión.',
      deleteButton: 'Eliminar asesor',
      confirmTitle: '¿Eliminar este asesor?',
      confirmDescription:
        'Esta acción no se puede deshacer. Se borrarán la cuenta del portal, el perfil y el acceso por correo.',
      confirmEmailLabel: 'Escribe el correo del asesor para confirmar',
      confirmPlaceholder: 'correo@ejemplo.com',
      copyEmail: 'Copiar correo',
      copyEmailSuccess: 'Correo copiado.',
      confirmDelete: 'Eliminar definitivamente',
      deleting: 'Eliminando…',
      successDelete: 'Asesor eliminado.',
      errors: {
        deleteFailed: 'No pudimos eliminar al asesor. Inténtalo de nuevo.',
        notFound: 'Asesor no encontrado.',
        copyEmailFailed: 'No pudimos copiar el correo. Selecciónalo y cópialo manualmente.',
      },
    },
  },
} as const
