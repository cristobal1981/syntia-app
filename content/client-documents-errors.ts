/**
 * Textos de los avisos de error de Documentos. Cada aviso dice qué ha pasado y
 * qué puede hacer la persona; nunca expone términos técnicos (Drive, API, códigos).
 */
export type DriveErrorCopy = { title: string; description: string }

export const driveErrorCopy = {
  forbidden: {
    title: 'Sin acceso a Documentos',
    description: 'No tienes permiso para ver esta sección. Si crees que es un error, contacta con tu asesoría.',
  },
  not_linked: {
    title: 'Documentos no disponibles',
    description: 'Tu espacio de documentos aún no está configurado. Contacta con tu asesoría para activarlo.',
  },
  not_configured: {
    title: 'Documentos aún no disponible',
    description: 'Este apartado todavía no está activo. Tu asesoría lo habilitará en breve.',
  },
  session_expired: {
    title: 'Tu sesión ha caducado',
    description: 'Vuelve a iniciar sesión para seguir con tus documentos.',
  },
  drive_unavailable: {
    title: 'No hemos podido cargar tus documentos',
    description: 'Es un problema temporal del servicio. Inténtalo de nuevo en unos minutos.',
  },
  timeout: {
    title: 'El servicio tarda demasiado en responder',
    description: 'Comprueba tu conexión e inténtalo de nuevo.',
  },
  rate_limited: {
    title: 'Demasiadas peticiones seguidas',
    description: 'Espera unos segundos e inténtalo de nuevo.',
  },
  storage_full: {
    title: 'No hay espacio disponible',
    description: 'El espacio de documentos está lleno. Avisa a tu asesoría para que lo amplíe.',
  },
  not_downloadable: {
    title: 'Este archivo no se puede descargar desde aquí',
    description: 'Pídele a tu asesoría que te lo envíe por otra vía.',
  },
  invalid_name: {
    title: 'El nombre del archivo no es válido',
    description: 'Evita caracteres especiales como / \\ : * ? " < > | y los nombres vacíos.',
  },
  invalid_type: {
    title: 'Tipo de archivo no permitido',
    description: 'Por seguridad no se pueden subir archivos ejecutables ni de instalación.',
  },
  upload_failed: {
    title: 'No hemos podido subir los archivos',
    description: 'Revisa la selección (hay un máximo de archivos por subida) e inténtalo de nuevo.',
  },
  name_conflict: {
    title: 'Ya existe un elemento con ese nombre',
    description: 'Cambia el nombre e inténtalo de nuevo.',
  },
  duplicate: {
    title: 'Este archivo ya existe',
    description: 'No se ha subido nada. Cambia el nombre del archivo o déjalo como está si ya lo tienes.',
  },
  offline: {
    title: 'Sin conexión a internet',
    description: 'Comprueba tu conexión e inténtalo de nuevo.',
  },
  unexpected: {
    title: 'Algo ha ido mal',
    description: 'No hemos podido completar la operación. Recarga la página; si el problema continúa, contacta con tu asesoría.',
  },
} as const satisfies Record<string, DriveErrorCopy>

/** Avisos cuyo texto depende de qué estaba haciendo la persona. */
export const driveErrorCopyByContext = {
  not_found: {
    load: {
      title: 'No encontramos esta carpeta',
      description: 'Puede que se haya movido o eliminado. Hemos actualizado la lista.',
    },
    folder: {
      title: 'Esta carpeta ya no está disponible',
      description: 'Puede que se haya movido o eliminado mientras tenías la página abierta. Hemos actualizado la lista.',
    },
    file: {
      title: 'Este archivo ya no está disponible',
      description: 'Puede que se haya movido o eliminado mientras tenías la página abierta. Hemos actualizado la lista.',
    },
    upload: {
      title: 'No se ha subido nada',
      description: 'La carpeta donde querías subir ya no está disponible. Hemos actualizado la lista.',
    },
    home: {
      title: 'La carpeta en la que estabas ya no está disponible',
      description: 'Te hemos llevado a Inicio.',
    },
  },
  too_large: {
    load: {
      title: 'El archivo es demasiado grande',
      description: 'Supera el tamaño máximo permitido.',
    },
    folder: {
      title: 'El archivo es demasiado grande',
      description: 'Supera el tamaño máximo permitido.',
    },
    file: {
      title: 'El archivo es demasiado grande',
      description: 'Supera el tamaño que se puede descargar desde el portal. Pídele a tu asesoría que te lo envíe por otra vía.',
    },
    upload: {
      title: 'El archivo es demasiado grande',
      description: 'Supera el tamaño máximo permitido para subir. Reduce su tamaño e inténtalo de nuevo.',
    },
    home: {
      title: 'El archivo es demasiado grande',
      description: 'Supera el tamaño máximo permitido.',
    },
  },
} as const
