export const profile = {
  pageTitle: 'Perfil',
  pageDescription:
    'Consulta tus datos de contacto y fiscales. Los cambios se solicitan a tu asesor y no se aplican al instante.',
  requestModeHint:
    'Modifica solo los datos que necesites. Enviaremos únicamente los campos que hayan cambiado.',
  sections: {
    contact: 'Contacto',
    fiscal: 'Datos fiscales',
    address: 'Dirección fiscal',
    personal: 'Datos personales',
  },
  labels: {
    name: 'Nombre',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    addressLine1: 'Calle y número',
    addressLine2: 'Piso, puerta (opcional)',
    postalCode: 'Código postal',
    city: 'Municipio',
    province: 'Provincia',
    country: 'País',
    vat: 'NIF/CIF',
    iban: 'IBAN',
    changeField: 'Quiero cambiar este dato',
    currentValue: 'Valor actual',
    newValue: 'Nuevo valor',
  },
  ticketChangeLabels: {
    name: 'Nombre',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    vat: 'NIF/CIF',
    iban: 'IBAN',
    addressLine1: 'Calle y número',
    addressLine2: 'Piso, puerta',
    postalCode: 'C.P.',
    city: 'Municipio',
    province: 'Provincia',
    country: 'País',
  },
  actions: {
    requestChange: 'Solicitar cambio de datos',
    submitRequest: 'Enviar solicitud',
    submitting: 'Enviando…',
    cancel: 'Cancelar',
  },
  drawer: {
    title: 'Solicitar cambio de datos',
    unsavedTitle: '¿Descartar cambios?',
    unsavedDescription:
      'Tienes cambios sin guardar. Si cierras ahora, se perderá lo que has escrito.',
    discard: 'Descartar',
    keepEditing: 'Seguir editando',
  },
  emptyPhone: 'No indicado',
  emptyValue: 'No indicado',
  successToast:
    'Solicitud enviada. Tu asesoría revisará los cambios y actualizará tu ficha.',
  successTitle: '¡Todo listo por aquí!',
  successMessage:
    'Tu asesor ya está revisando tu perfil. Te avisaremos en cuanto esté todo actualizado.',
  successDismiss: 'Estupendo',
  states: {
    notLinked: {
      title: 'Cuenta sin vincular',
      description:
        'Tu perfil aún no está vinculado con Odoo. Contacta con tu asesor para activar tus datos en el portal.',
    },
    odooUnavailable: {
      title: 'No pudimos cargar tu perfil',
      description:
        'El servicio de Odoo no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    },
  },
  errors: {
    unauthorized: 'Debes iniciar sesión para solicitar cambios.',
    forbidden: 'Esta sección solo está disponible para clientes.',
    not_linked:
      'Tu cuenta no está vinculada con Odoo. Contacta con tu asesor para activar tus datos.',
    odoo_unavailable:
      'No pudimos consultar tu perfil en este momento. Inténtalo de nuevo en unos minutos.',
    create_failed:
      'No pudimos registrar tu solicitud en Odoo. Inténtalo de nuevo o contacta con tu asesor.',
    no_changes: 'No has modificado ningún dato. Cambia al menos un campo antes de enviar.',
    name: 'El nombre es obligatorio.',
    unknown: 'No pudimos enviar la solicitud. Inténtalo de nuevo.',
    email: 'Introduce un correo electrónico válido.',
    phone: 'Introduce un teléfono válido.',
    vat: 'Introduce un NIF, NIE o CIF válido.',
    iban: 'Introduce un IBAN válido.',
    addressLine1: 'La calle y número son obligatorios.',
    postalCode: 'Introduce un código postal de 5 dígitos.',
    city: 'El municipio es obligatorio.',
    province: 'La provincia es obligatoria.',
    country: 'El país es obligatorio.',
  },
} as const
