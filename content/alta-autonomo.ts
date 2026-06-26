export const altaAutonomo = {
  meta: {
    title: 'Alta de autónomo',
    description:
      'Recopilamos tus datos por pasos para preparar el alta. Puedes guardar el progreso y continuar más tarde.',
  },
  intro: {
    title: 'Alta de autónomo',
    description:
      'Te guiaremos paso a paso. Solo verás las preguntas que aplican a tu situación; según respondas, iremos abriendo los campos necesarios.',
    startButton: 'Empezar',
    durationHint: 'Unos 10–15 minutos · puedes pausar y volver cuando quieras',
    whatYouNeedTitle: 'Qué necesitarás',
    whatYouNeedItems: [
      'DNI o NIE y datos de contacto',
      'Idea clara de la actividad que vas a desarrollar',
      'Si ya fuiste autónomo, la fecha aproximada de baja',
    ],
  },
  progress: {
    label: 'Progreso del formulario',
    stepLabel: 'Paso {current} de {total}',
  },
  nav: {
    back: 'Anterior',
    next: 'Siguiente',
    saveAndExit: 'Guardar y salir',
    submit: 'Enviar solicitud',
    submitPending: 'Enviando…',
  },
  steps: {
    situacion: {
      title: 'Tu situación',
      description:
        'Con estas respuestas adaptamos el formulario. Aparecerán solo los campos que te correspondan.',
    },
    datosPersonales: {
      title: 'Datos personales',
      description: 'Información de identificación y contacto para la gestión del alta.',
    },
    actividad: {
      title: 'Actividad',
      description: 'Detalles de la actividad económica que vas a desarrollar.',
    },
    resumen: {
      title: 'Resumen',
      description: 'Revisa la información antes de enviarla a tu asesoría.',
    },
  },
  fields: {
    wasAutonomoBefore: {
      label: '¿Has sido autónomo antes?',
      options: { yes: 'Sí', no: 'No' },
    },
    previousBajaDate: {
      label: '¿Cuándo te diste de baja?',
      hint: 'Aproximadamente. Nos ayuda a comprobar si hay trámites previos.',
      placeholder: 'Ej. marzo 2024',
    },
    willHaveEmployees: {
      label: '¿Vas a contratar empleados?',
      options: { yes: 'Sí', no: 'No' },
    },
    employeesCount: {
      label: '¿Cuántos empleados prevés contratar al inicio?',
      placeholder: 'Ej. 1',
    },
    fullName: {
      label: 'Nombre y apellidos',
      placeholder: 'Como figuran en tu DNI o NIE',
    },
    taxId: {
      label: 'DNI o NIE',
      placeholder: 'Ej. 12345678Z',
    },
    email: {
      label: 'Correo electrónico',
      placeholder: 'tu@correo.com',
    },
    phone: {
      label: 'Teléfono',
      placeholder: 'Ej. 600 000 000',
    },
    activityDescription: {
      label: 'Describe tu actividad',
      placeholder: 'Qué vas a hacer, a quién te diriges, de forma breve…',
    },
    startDate: {
      label: 'Fecha prevista de inicio',
      hint: 'Cuándo quieres darte de alta como autónomo.',
    },
    invoicesEu: {
      label: '¿Vas a facturar a clientes en la Unión Europea?',
      options: { yes: 'Sí', no: 'No' },
    },
    euVatNumber: {
      label: 'Número de IVA intracomunitario (si ya lo tienes)',
      placeholder: 'Opcional',
    },
    observations: {
      label: 'Observaciones (opcional)',
      placeholder: 'Cualquier detalle que debamos tener en cuenta…',
    },
  },
  resumen: {
    emptySection: 'Sin datos en este apartado',
    notAnswered: 'Sin responder',
    submitStub:
      'El envío definitivo se conectará con tu asesoría. Por ahora puedes revisar el borrador.',
    submitSuccess: 'Borrador listo. Tu asesoría recibirá la solicitud cuando activemos el envío.',
  },
} as const
