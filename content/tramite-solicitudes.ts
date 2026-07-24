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
    comingSoonCard: {
      title: 'Cuestionarios ágiles',
      description:
        'Próximamente tendrás cuestionarios ágiles en esta sección para solicitudes como altas, bajas o vacaciones.',
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
      dni: {
        label: 'DNI o NIE',
        placeholder: 'Ej. 12345678Z',
      },
      observations: {
        label: 'Observaciones (opcional)',
        placeholder: 'Cualquier detalle adicional que debamos tener en cuenta…',
      },
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
      startDate: { label: 'Fecha de alta' },
      contractType: {
        label: 'Tipo de contrato',
        placeholder: 'Selecciona un tipo',
        options: {
          indefinido: 'Indefinido',
          temporal: 'Temporal',
          formacion: 'Formación',
          practicas: 'Prácticas',
          obra_servicio: 'Obra o servicio',
          otros: 'Otros',
        },
      },
      workSchedule: {
        label: 'Jornada',
        placeholder: 'Selecciona la jornada',
        options: {
          completa: 'Completa',
          parcial: 'Parcial',
        },
      },
      position: {
        label: 'Puesto o categoría',
        placeholder: 'Ej. Administrativo, comercial…',
      },
      grossSalary: {
        label: 'Salario bruto anual',
        placeholder: 'Ej. 24.000',
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
    dniRequired: 'El DNI o NIE es obligatorio.',
    dniInvalid: 'Introduce un DNI o NIE válido.',
    dateRequired: 'La fecha es obligatoria.',
    dateInvalid: 'La fecha no es válida.',
    dateInPast: 'La fecha de alta no puede ser anterior a hoy.',
    periodEndBeforeStart: 'La fecha de fin debe ser posterior a la de inicio.',
    selectRequired: 'Selecciona una opción.',
    positionRequired: 'El puesto o categoría es obligatorio.',
    grossSalaryRequired: 'El salario bruto es obligatorio.',
    grossSalaryInvalid: 'Introduce un importe numérico válido.',
    daysRequired: 'Los días de vacaciones son obligatorios.',
    daysInvalid: 'Introduce un número de días válido.',
    vacationYearRequired: 'El año de vacaciones es obligatorio.',
    vacationYearInvalid: 'Introduce un año válido.',
    observationsTooLong: 'Las observaciones no pueden superar 500 caracteres.',
    forbidden: 'No tienes permiso para crear solicitudes.',
    not_linked: 'Tu cuenta no está vinculada con Odoo.',
    odoo_unavailable: 'No pudimos crear la solicitud. Inténtalo de nuevo.',
    create_failed: 'No pudimos crear la solicitud en Odoo.',
    unknown: 'No pudimos crear la solicitud. Inténtalo de nuevo.',
  },
} as const
