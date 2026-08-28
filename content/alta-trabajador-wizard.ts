import { tramiteSolicitudes } from '@/content/tramite-solicitudes'

export const altaTrabajadorWizard = {
  meta: {
    title: tramiteSolicitudes.altaTrabajador.title,
    description: tramiteSolicitudes.altaTrabajador.description,
  },
  intro: {
    title: tramiteSolicitudes.altaTrabajador.title,
    description: tramiteSolicitudes.altaTrabajador.description,
    startButton: 'Empezar',
    resumeButton: 'Continuar donde lo dejé',
    startFreshButton: 'Empezar de nuevo',
    draftHint: 'Tienes un borrador guardado de una solicitud anterior.',
    durationHint: 'Unos 10 minutos · puedes pausar y volver cuando quieras',
    whatYouNeedTitle: 'Qué necesitarás',
    whatYouNeedItems: [
      'DNI o NIE, dirección y datos de contacto del trabajador',
      'Fecha de alta, tipo de contrato y puesto',
      'Ocupación SEPE y nivel de estudios del puesto',
      'Documentación identificativa (si aplica autorización de trabajo temporal)',
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
    submit: tramiteSolicitudes.common.submit,
    submitPending: tramiteSolicitudes.common.creating,
  },
  steps: {
    datosPersonales: {
      title: 'Datos personales',
      description: 'Identificación y contacto de la persona que vas a dar de alta.',
    },
    domicilio: {
      title: 'Domicilio habitual',
      description: 'Fecha de nacimiento y dirección del trabajador.',
    },
    puestoOcupacion: {
      title: 'Puesto y ocupación',
      description: 'Fecha de alta, puesto, ocupación SEPE y nivel de estudios.',
    },
    contrato: {
      title: tramiteSolicitudes.common.sections.details,
      description: 'Condiciones del contrato.',
    },
    teletrabajo: {
      title: 'Teletrabajo',
      description: 'Indica si el trabajador va a realizar teletrabajo.',
    },
    retribucionHorario: {
      title: 'Retribución y horario',
      description: 'Salario y horario de trabajo semanal.',
    },
    documentacion: {
      title: 'Documentación y observaciones',
      description: 'Documentación identificativa y cualquier detalle adicional.',
    },
    resumen: {
      title: 'Resumen',
      description: 'Revisa los datos antes de enviar la solicitud.',
    },
  },
  fields: {
    partialWeeklyHours: {
      label: 'Horas semanales (jornada parcial)',
      placeholder: 'Ej. 20',
      hint: 'Indica las horas semanales previstas en contrato parcial.',
    },
    contractEndDate: {
      label: 'Fecha de fin de contrato',
      hint: 'Obligatoria para contratos de formación, otros, o temporales por incremento de tareas u otras causas.',
    },
  },
  occupationCombobox: {
    placeholder: 'Busca por código o descripción',
    searchPlaceholder: 'Escribe para buscar…',
    emptyResults: 'Sin resultados',
    moreResultsHint: 'Sigue escribiendo para acotar la búsqueda',
  },
  attachment: {
    selectButton: 'Seleccionar archivo',
    removeButton: 'Quitar',
    noFileSelected: 'Ningún archivo seleccionado',
  },
  resumen: {
    notAnswered: '—',
    sections: {
      personal: 'Datos personales',
      domicilio: 'Domicilio',
      puesto: 'Puesto y ocupación',
      contrato: tramiteSolicitudes.common.sections.details,
      teletrabajo: 'Teletrabajo',
      retribucion: 'Retribución y horario',
      documentacion: 'Documentación',
    },
  },
} as const
