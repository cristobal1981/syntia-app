export const tramiteSolicitudes = {
  picker: {
    title: 'Nueva solicitud',
    description:
      'Elige el trámite que necesitas. Recogeremos los datos clave para que tu asesoría pueda gestionarlo.',
    back: 'Volver',
    general: {
      id: 'general' as const,
      label: 'Consulta general',
      description: 'Duda o tema que no encaja en los trámites anteriores.',
    },
    altaTrabajador: {
      id: 'alta-trabajador' as const,
      label: 'Alta de trabajador',
      description:
        'Formulario guiado por pasos. Contratación, alta en Seguridad Social y datos del puesto.',
    },
    bajaTrabajador: {
      id: 'baja-trabajador' as const,
      label: 'Baja de trabajador',
      description: 'Fin de contrato, dimisión u otra causa de baja.',
    },
    cartaVacaciones: {
      id: 'carta-vacaciones' as const,
      label: 'Carta de vacaciones',
      description: 'Solicitud de carta o comunicación de periodo de vacaciones.',
    },
  },
  common: {
    creating: 'Creando…',
    submit: 'Enviar solicitud',
    cancel: 'Cancelar',
    successToast: 'Solicitud enviada. Tu asesoría la revisará y te responderá en el trámite.',
    sections: {
      worker: 'Datos del trabajador',
      details: 'Detalle del trámite',
      observations: 'Observaciones',
    },
    fields: {
      fullName: {
        label: 'Nombre y apellidos',
        placeholder: 'Ej. Ana García López',
      },
      firstName: {
        label: 'Nombre',
        placeholder: 'Ej. Ana',
      },
      lastName: {
        label: 'Apellidos',
        placeholder: 'Ej. García López',
      },
      dni: {
        label: 'DNI o NIE',
        placeholder: 'Ej. 12345678Z',
      },
      observations: {
        label: 'Observaciones (opcional)',
        placeholder: 'Cualquier detalle adicional que debamos tener en cuenta…',
      },
    },
    address: {
      street: { label: 'Vía', placeholder: 'Ej. Calle Mayor' },
      number: { label: 'Número', placeholder: 'Ej. 12, 3ºB' },
      city: { label: 'Municipio', placeholder: 'Ej. Madrid' },
      province: { label: 'Provincia', placeholder: 'Ej. Madrid' },
      postalCode: { label: 'Código postal', placeholder: 'Ej. 28001' },
    },
    weekdays: {
      lunes: 'Lunes',
      martes: 'Martes',
      miercoles: 'Miércoles',
      jueves: 'Jueves',
      viernes: 'Viernes',
      sabado: 'Sábado',
      domingo: 'Domingo',
    },
    unsavedTitle: '¿Descartar cambios?',
    unsavedDescription:
      'Tienes cambios sin guardar. Si cierras ahora, se perderá lo que has escrito.',
    discard: 'Descartar',
    keepEditing: 'Seguir editando',
  },
  altaTrabajador: {
    title: 'Alta de trabajador',
    description:
      'Indica los datos del nuevo trabajador y del contrato. Tu asesoría tramitará el alta.',
    subjectTemplate: 'Alta trabajador — {nombre}',
    successToast: 'Alta de trabajador enviada. Aparecerá en tus trámites como tarea.',
    fields: {
      naf: {
        label: 'Número de afiliación a la Seguridad Social (NAF)',
        placeholder: 'Ej. 281234567890',
      },
      email: {
        label: 'Correo electrónico',
        placeholder: 'Ej. ana@empresa.com',
      },
      phone: {
        label: 'Teléfono móvil',
        placeholder: 'Ej. 612 345 678',
      },
      iban: {
        label: 'Cuenta bancaria (IBAN)',
        placeholder: 'Ej. ES00 0000 0000 0000 0000 0000',
      },
      birthDate: { label: 'Fecha de nacimiento' },
      startDate: { label: 'Fecha de alta' },
      workCenter: {
        label: 'Centro de trabajo adscrito',
        placeholder: 'Ej. Oficina central',
      },
      position: {
        label: 'Puesto o categoría',
        placeholder: 'Ej. Administrativo, comercial…',
      },
      jobDuties: {
        label: 'Funciones a desempeñar',
        placeholder: 'Describe brevemente las funciones del puesto',
      },
      sepeOccupationCode: {
        label: 'Ocupación (catálogo SEPE)',
        placeholder: 'Busca por código o descripción',
      },
      studiesLevel: {
        label: 'Nivel de estudios requerido para el puesto',
        placeholder: 'Selecciona un nivel',
      },
      contractType: {
        label: 'Tipo de contrato',
        placeholder: 'Selecciona un tipo',
        options: {
          indefinido: 'Indefinido',
          temporal: 'Temporal',
          formacion: 'Formación',
          otros: 'Otros',
        },
      },
      temporaryReason: {
        label: 'Causa del contrato temporal',
        placeholder: 'Selecciona una causa',
        options: {
          incremento_tareas: 'Incremento temporal de tareas',
          sustitucion_vacaciones: 'Sustitución de personal de vacaciones',
          sustitucion_it: 'Sustitución de personal en baja por incapacidad temporal',
          sustitucion_paternidad_maternidad:
            'Sustitución de personal en situación de paternidad/maternidad',
          otras_causas: 'Otras causas',
        },
      },
      temporaryIncreaseCauses: {
        label: 'Explica detalladamente las causas del incremento',
        placeholder: 'Describe el incremento de tareas',
      },
      temporaryDurationReason: {
        label: 'Por qué se estima esta duración de contrato',
        placeholder: 'Explica el motivo de la duración estimada',
      },
      vacationSubstitutionDetails: {
        label: 'Trabajadores a sustituir y fechas de sus vacaciones',
        placeholder: 'Indica nombre y fechas de vacaciones',
      },
      employeeToSubstitute: {
        label: 'Trabajador a sustituir',
        placeholder: 'Nombre del trabajador sustituido',
      },
      otherTemporaryReasonDetail: {
        label: 'Motivo de contratación',
        placeholder: 'Explica el motivo de la contratación temporal',
      },
      trainingType: {
        label: 'Tipo de prácticas',
        placeholder: 'Selecciona un tipo',
        options: {
          practicas_curriculares: 'Prácticas curriculares (obligatorias de un plan de formación reglado)',
          practicas_extracurriculares: 'Prácticas extracurriculares',
        },
      },
      trainingHasScholarship: {
        label: '¿El alumnado va a percibir bolsa de estudios?',
        placeholder: 'Selecciona una opción',
        options: { si: 'Sí', no: 'No' },
      },
      trainingScholarshipAmount: {
        label: 'Importe de la bolsa',
        placeholder: 'Ej. 300',
      },
      trainingScholarshipPayer: {
        label: 'Entidad que paga directamente al estudiante',
        placeholder: 'Nombre de la entidad',
      },
      otherContractReason: {
        label: 'Motivo de contratación',
        placeholder: 'Explica el motivo de la contratación',
      },
      isTelework: {
        label: '¿El trabajador va a realizar teletrabajo?',
        placeholder: 'Selecciona una opción',
        options: { si: 'Sí', no: 'No' },
        hint: 'Si respondes que sí, después podrás indicar si es toda la jornada o solo algunos días de la semana.',
      },
      teleworkAddressSectionTitle: 'Dirección de teletrabajo',
      teleworkAddressSameAsHome: 'Usar el domicilio habitual',
      teleworkEquipment: {
        label: 'Equipos y materiales proporcionados para el teletrabajo',
        placeholder: 'Describe los equipos proporcionados',
      },
      teleworkAmountAgreed: {
        label: 'Importe acordado en concepto de teletrabajo',
        placeholder: 'Indica el importe o "el habitual, igual que al resto de trabajadores"',
      },
      teleworkFullTime: {
        label: '¿Toda la jornada se realizará en teletrabajo?',
        placeholder: 'Selecciona una opción',
        options: { si: 'Sí', no: 'No' },
      },
      teleworkDaysRemote: {
        label: 'Días de teletrabajo',
      },
      teleworkDaysOnsite: {
        label: 'Días de trabajo presencial',
      },
      salaryType: {
        label: 'Salario',
        placeholder: 'Selecciona una opción',
        options: {
          convenio: 'Según convenio colectivo',
          pactado: 'Salario pactado',
        },
      },
      grossSalary: {
        label: 'Salario bruto pactado',
        placeholder: 'Ej. 24.000 (sin incluir el importe de teletrabajo)',
      },
      workSchedule: {
        label: 'Jornada',
        placeholder: 'Selecciona la jornada',
        options: {
          completa: 'Completa',
          parcial: 'Parcial',
        },
      },
      workDays: {
        label: 'Días de trabajo semanal',
        derivedHint: 'Calculado a partir de los días de teletrabajo y presencial indicados en el paso anterior.',
        options: {
          lunes: 'Lunes',
          martes: 'Martes',
          miercoles: 'Miércoles',
          jueves: 'Jueves',
          viernes: 'Viernes',
          sabado: 'Sábado',
          domingo: 'Domingo',
        },
      },
      workHoursDescription: {
        label: 'Horario de cada día',
        placeholder: 'Ej. Lunes a viernes de 9:00 a 17:00',
      },
      workScheduleNotes: {
        label: 'Otras observaciones sobre el horario (opcional)',
        placeholder: 'Cualquier detalle adicional sobre el horario',
      },
      requiresWorkAuthorization: {
        label: '¿El trabajador tiene autorización de trabajo temporal (extranjería)?',
        placeholder: 'Selecciona una opción',
        options: { si: 'Sí', no: 'No' },
      },
      identityDocument: {
        label: 'Documentación identificativa',
        hint: 'Obligatorio si el trabajador tiene autorización de trabajo temporal.',
      },
    },
  },
  bajaTrabajador: {
    title: 'Baja de trabajador',
    description:
      'Indica los datos del trabajador y la fecha de baja. Tu asesoría tramitará la baja.',
    subjectTemplate: 'Baja trabajador — {nombre}',
    successToast: 'Baja de trabajador enviada. Tu asesoría tramitará la baja.',
    fields: {
      endDate: { label: 'Fecha de baja' },
      reason: {
        label: 'Motivo de la baja',
        placeholder: 'Selecciona un motivo',
        options: {
          fin_contrato: 'Fin de contrato',
          dimision: 'Dimisión del trabajador',
          despido: 'Despido',
          mutuo_acuerdo: 'Mutuo acuerdo',
          otros: 'Otros',
        },
      },
    },
  },
  cartaVacaciones: {
    title: 'Carta de vacaciones',
    description:
      'Indica el periodo y los días de vacaciones. Tu asesoría emitirá la carta correspondiente.',
    subjectTemplate: 'Carta de vacaciones — {nombre}',
    successToast: 'Solicitud de carta de vacaciones enviada.',
    fields: {
      periodStart: { label: 'Vacaciones desde' },
      periodEnd: { label: 'Vacaciones hasta' },
      days: {
        label: 'Días de vacaciones',
        placeholder: 'Ej. 15',
      },
      vacationYear: {
        label: 'Año de vacaciones',
        placeholder: 'Ej. 2026',
      },
    },
  },
  errors: {
    fullNameRequired: 'El nombre es obligatorio.',
    fullNameTooLong: 'El nombre no puede superar 120 caracteres.',
    firstNameRequired: 'El nombre es obligatorio.',
    firstNameTooLong: 'El nombre no puede superar 120 caracteres.',
    lastNameRequired: 'Los apellidos son obligatorios.',
    lastNameTooLong: 'Los apellidos no pueden superar 120 caracteres.',
    dniRequired: 'El DNI o NIE es obligatorio.',
    dniInvalid: 'Introduce un DNI o NIE válido.',
    dateRequired: 'La fecha es obligatoria.',
    dateInvalid: 'La fecha no es válida.',
    dateInPast: 'La fecha de alta no puede ser anterior a hoy.',
    periodEndBeforeStart: 'La fecha de fin debe ser posterior a la de inicio.',
    selectRequired: 'Selecciona una opción.',
    requiredField: 'Este campo es obligatorio.',
    positionRequired: 'El puesto o categoría es obligatorio.',
    grossSalaryRequired: 'El salario bruto es obligatorio.',
    grossSalaryInvalid: 'Introduce un importe numérico válido.',
    amountInvalid: 'Introduce un importe numérico válido.',
    daysRequired: 'Los días de vacaciones son obligatorios.',
    daysInvalid: 'Introduce un número de días válido.',
    vacationYearRequired: 'El año de vacaciones es obligatorio.',
    vacationYearInvalid: 'Introduce un año válido.',
    observationsTooLong: 'Las observaciones no pueden superar 500 caracteres.',
    emailInvalid: 'Introduce un correo electrónico válido.',
    phoneInvalid: 'Introduce un teléfono válido.',
    ibanInvalid: 'Introduce un IBAN español válido.',
    postalCodeInvalid: 'Introduce un código postal válido.',
    attachmentRequired: 'Adjunta la documentación identificativa.',
    daysOverlap: 'Un mismo día no puede ser de teletrabajo y presencial a la vez.',
    forbidden: 'No tienes permiso para crear solicitudes.',
    not_linked: 'Tu cuenta no está vinculada con Odoo.',
    odoo_unavailable: 'No pudimos crear la solicitud. Inténtalo de nuevo.',
    create_failed: 'No pudimos crear la solicitud en Odoo.',
    unknown: 'No pudimos crear la solicitud. Inténtalo de nuevo.',
  },
} as const
