export const solicitudes = {
  page: {
    eyebrow: 'Administración',
    title: 'Solicitudes',
    description:
      'Gestiona los enlaces de acceso al formulario de alta de autónomo para tus clientes.',
  },
  altaAutonomo: {
    sectionTitle: 'Nueva solicitud de alta de autónomo',
    sectionDescription:
      'Elige un cliente y genera un enlace privado para que complete el formulario en la web.',
    clientLabel: 'Cliente',
    clientPlaceholder: 'Selecciona un cliente',
    noClients: 'No hay clientes disponibles. Crea uno en Usuarios → Clientes.',
    urlLabel: 'Enlace del formulario',
    urlPlaceholder: 'Genera un enlace para mostrarlo aquí',
    createButton: 'Generar enlace',
    creating: 'Generando…',
    copyButton: 'Copiar enlace',
    generated: 'Enlace generado',
    copied: 'Enlace copiado',
    copyError: 'No se pudo copiar el enlace. Cópialo manualmente.',
    generateError: 'No se pudo generar el enlace. Inténtalo de nuevo.',
    emailButton: 'Enviar por email (próximamente)',
    emailHint:
      'El envío por email llegará en una siguiente versión. Por ahora comparte el enlace manualmente.',
  },
  list: {
    sectionTitle: 'Solicitudes de alta de autónomo',
    sectionDescription:
      'Enlaces generados para el formulario. Las pendientes están activas y listas para compartir.',
    filterPending: 'Pendientes',
    filterAll: 'Todas',
    emptyPendingTitle: 'Sin solicitudes pendientes',
    emptyPendingDescription:
      'Cuando generes un enlace activo para un cliente, aparecerá aquí.',
    emptyAllTitle: 'Sin solicitudes',
    emptyAllDescription: 'Aún no se ha generado ningún enlace de alta de autónomo.',
    columns: {
      client: 'Cliente',
      email: 'Email',
      status: 'Estado',
      created: 'Creada',
      expires: 'Caduca',
      actions: 'Acciones',
    },
    status: {
      active: 'Pendiente',
      used: 'Completada',
      revoked: 'Revocada',
      expired: 'Caducada',
    },
    actions: {
      copy: 'Copiar enlace',
      revoke: 'Revocar',
      delete: 'Eliminar',
      revoking: 'Revocando…',
      deleting: 'Eliminando…',
    },
    revokeSuccess: 'Solicitud revocada',
    revokeError: 'No se pudo revocar la solicitud',
    deleteSuccess: 'Solicitud eliminada',
    deleteError: 'No se pudo eliminar la solicitud',
    deleteConfirm:
      '¿Eliminar esta solicitud? El enlace dejará de existir y no se podrá recuperar.',
    unknownClient: 'Cliente sin asignar',
  },
} as const
