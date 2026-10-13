export const leads = {
  title: 'Oportunidades',
  description:
    'Informe de las simulaciones del plan de autónomos: quién sigue de verdad y quién solo curioseaba.',
  emptyTitle: 'Sin oportunidades todavía',
  emptyDescription:
    'Cuando alguien complete el simulador del plan de autónomos, aparecerá aquí.',
  countLabel: 'oportunidades',
  estados: {
    pendiente: 'Pendiente',
    aceptado: 'Aceptado',
    rechazado: 'Rechazado',
    no_interesa: 'No interesa',
  },
  kpi: {
    totalLeads: 'Oportunidades totales',
    conversionRate: 'Conversión real',
    lostAnnualValue: 'Valor anual perdido',
  },
  funnel: {
    title: 'Funnel por estado declarado',
    description: 'Cómo se distribuyen las oportunidades según el estado que registra la landing.',
  },
  convertedAnyway: {
    title: 'Conversión real vs. estado declarado',
    description:
      'Cruce con los clientes reales del portal — el estado de la landing no siempre coincide con lo que pasó de verdad.',
    convertedOf: '{converted} de {total} acabaron siendo clientes reales',
    noLeads: 'Sin oportunidades en este estado.',
  },
  segments: {
    title: 'Perfil por segmento',
    description: 'Tasa de conversión real cruzada por perfil de la oportunidad.',
    sinDato: 'Sin dato',
    conversionSuffix: 'conversión',
    tipo: {
      title: 'Tipo de alta',
      labels: {
        ALTA: 'Alta',
        CAMBIO: 'Cambio de asesoría',
      },
    },
    residencia: {
      title: 'Residencia',
      labels: {
        Canarias: 'Canarias',
        Peninsula: 'Península',
      },
    },
    codigoCuota: {
      title: 'Tramo de cuota',
      labels: {
        TRAMO_30: 'Tramo 30',
        TRAMO_50: 'Tramo 50',
        TRAMO_90: 'Tramo 90',
      },
    },
    facturacion: {
      title: 'Facturación estimada',
      bucketLabels: {
        lt_9600: '< 9.600 €',
        from_9600_to_12600: '9.600 – 12.600 €',
        from_12600_to_17000: '12.600 – 17.000 €',
        from_17000_to_50000: '17.000 – 50.000 €',
        gte_50000: '≥ 50.000 €',
      },
    },
  },
  motivos: {
    title: 'Motivos',
    description: 'Lectura cualitativa de por qué rechazan o pierden el interés.',
    searchPlaceholder: 'Buscar por nombre, email o motivo…',
    emptyTitle: 'Sin motivos registrados',
    emptyDescription: 'Todavía no hay ninguna oportunidad con un motivo escrito.',
    noResults: 'No hay resultados para «{query}».',
  },
  trend: {
    title: 'Volumen por día',
    description: 'Oportunidades recibidas en el periodo mostrado.',
  },
  contact: {
    title: 'Contactar',
    description:
      'Oportunidades que no acabaron siendo clientes — contacto manual, uno a uno, con mensaje editable.',
    emptyTitle: 'Nada que hacer aquí por ahora',
    emptyDescription: 'No hay oportunidades pendientes de un contacto manual.',
    columns: {
      lead: 'Oportunidad',
      cuota: 'Cuota mensual',
      status: 'Estado',
    },
    button: 'Contactar',
    alreadyContactedToday: 'Contactado hoy',
    alreadyContactedDays: 'Contactado hace {days} días',
    defaultSubject: 'Seguimos aquí para cuando quieras retomarlo',
    defaultBody:
      'Vimos que hace poco simulaste tu cuota como autónomo con nosotros y te quedaste a un paso de dar el salto.\n\nSi en algún momento quieres retomarlo, o simplemente resolver dudas, aquí seguimos — sin compromiso ni prisa. Puedes responder directamente a este correo.',
    drawer: {
      title: 'Contactar a {nombre}',
      subjectLabel: 'Asunto',
      bodyLabel: 'Mensaje',
      bodyHint: 'Edítalo como quieras antes de enviar — no se envía nada automáticamente.',
      send: 'Enviar correo',
      sending: 'Enviando…',
      cancel: 'Cancelar',
    },
    sendSuccess: 'Correo enviado',
    sendError: 'No se pudo enviar el correo',
  },
}
