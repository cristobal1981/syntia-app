export const solicitudes = {
  page: {
    eyebrow: 'Administración',
    title: 'Solicitudes',
    description:
      'Enlaces de acceso al formulario de alta de autónomo para tus clientes.',
  },
  altaAutonomo: {
    newButton: 'Nueva solicitud',
    modalTitle: 'Nueva solicitud de alta de autónomo',
    modalDescription:
      'Elige un cliente y genera un enlace privado para que complete el formulario en la web.',
    clientLabel: 'Cliente',
    clientPlaceholder: 'Selecciona un cliente',
    noClients: 'No hay clientes disponibles. Crea uno en Usuarios → Clientes.',
    createButton: 'Generar enlace',
    creating: 'Generando…',
    generated: 'Enlace generado',
    generatedStateTitle: 'Solicitud creada correctamente',
    generatedStateDescription:
      'El enlace ya está generado y listo para compartir con este cliente.',
    generateError: 'No se pudo generar el enlace. Inténtalo de nuevo.',
    copyLink: 'Copiar enlace',
    linkCopied: 'Enlace copiado',
    copyLinkError: 'No se pudo copiar el enlace. Cópialo manualmente.',
  },
  list: {
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
      token: 'Código',
      status: 'Estado',
      created: 'Creada',
      expires: 'Caduca',
      actions: 'Acciones',
    },
    token: {
      show: 'Mostrar código',
      hide: 'Ocultar código',
      copy: 'Copiar código',
      copied: 'Código copiado',
      copyError: 'No se pudo copiar el código. Cópialo manualmente.',
      hiddenHint: 'Código oculto',
    },
    status: {
      active: 'Pendiente',
      used: 'Completada',
      revoked: 'Revocada',
      expired: 'Caducada',
    },
    actions: {
      sendLink: 'Enviar enlace',
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
