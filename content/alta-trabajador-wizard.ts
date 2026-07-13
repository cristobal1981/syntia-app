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
    durationHint: 'Unos 5 minutos · puedes pausar y volver cuando quieras',
    whatYouNeedTitle: 'Qué necesitarás',
    whatYouNeedItems: [
      'DNI o NIE del trabajador',
      'Fecha de alta y tipo de contrato',
      'Puesto y salario bruto anual',
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
    datosTrabajador: {
      title: tramiteSolicitudes.common.sections.worker,
      description: 'Identificación de la persona que vas a dar de alta.',
    },
    contrato: {
      title: tramiteSolicitudes.common.sections.details,
      description: 'Condiciones del contrato y del puesto.',
    },
    observaciones: {
      title: tramiteSolicitudes.common.sections.observations,
      description: 'Cualquier detalle adicional para tu asesoría.',
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
      hint: 'Obligatoria para contratos temporales o por obra/servicio.',
    },
  },
  resumen: {
    notAnswered: 'Sin responder',
  },
} as const
