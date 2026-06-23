export type FiscalModelGuideEntry = {
  code: string
  label: string
  title: string
  description: string
  /** Hasta 3 etiquetas visibles en la ficha */
  tags: readonly string[]
  /** Sinónimos y términos para búsqueda (guía y obligaciones) */
  keywords: readonly string[]
}

export const fiscalModelsGuide = {
  title: 'Guía de modelos tributarios',
  description:
    'Para qué sirve cada modelo fiscal y en qué situaciones suele presentarse. Si tienes dudas sobre tu caso concreto, tu gestor te orientará.',
  backToObligaciones: 'Volver a obligaciones',
  searchLabel: 'Buscar en la guía',
  searchPlaceholder: 'Ej.: alquiler, IVA, nóminas…',
  noResultsTitle: 'Sin resultados',
  noResultsDescription:
    'No encontramos modelos relacionados con ese término. Prueba con otra palabra.',
  models: [
    {
      code: '111',
      label: 'Modelo 111',
      title: 'Retenciones e ingresos a cuenta del IRPF',
      description:
        'Declaración trimestral de retenciones practicadas a trabajadores, profesionales y otras rentas del trabajo o actividades económicas.',
      tags: ['nóminas', 'retenciones', 'irpf'],
      keywords: [
        'nóminas',
        'nomina',
        'retenciones',
        'irpf',
        'trabajadores',
        'profesionales',
        'sueldos',
      ],
    },
    {
      code: '115',
      label: 'Modelo 115',
      title: 'Retenciones por alquiler de inmuebles urbanos',
      description:
        'Declaración de retenciones e ingresos a cuenta del IRPF sobre rentas de arrendamiento de inmuebles en urbano.',
      tags: ['alquiler', 'arrendamiento', 'retenciones'],
      keywords: [
        'alquiler',
        'alquileres',
        'arrendamiento',
        'inmueble',
        'vivienda',
        'retenciones',
        'irpf',
      ],
    },
    {
      code: '123',
      label: 'Modelo 123',
      title: 'Retenciones sobre rendimientos de actividades económicas',
      description:
        'Declaración de retenciones e ingresos a cuenta practicados a quienes desarrollan actividades económicas.',
      tags: ['autónomos', 'retenciones', 'irpf'],
      keywords: [
        'retenciones',
        'actividades',
        'profesionales',
        'autónomos',
        'autonomo',
        'irpf',
        'rendimientos',
      ],
    },
    {
      code: '130',
      label: 'Modelo 130',
      title: 'Pago fraccionado del IRPF (estimación directa)',
      description:
        'Pago a cuenta trimestral del IRPF para autónomos y profesionales en estimación directa.',
      tags: ['autónomos', 'irpf', 'trimestral'],
      keywords: [
        'autónomo',
        'autonomo',
        'irpf',
        'pago fraccionado',
        'trimestral',
        'estimación directa',
        'directa',
      ],
    },
    {
      code: '131',
      label: 'Modelo 131',
      title: 'Pago fraccionado del IRPF (módulos)',
      description:
        'Pago a cuenta trimestral del IRPF para autónomos en estimación objetiva por módulos.',
      tags: ['autónomos', 'módulos', 'irpf'],
      keywords: [
        'autónomo',
        'autonomo',
        'módulos',
        'modulos',
        'irpf',
        'pago fraccionado',
        'objetiva',
      ],
    },
    {
      code: '180',
      label: 'Modelo 180',
      title: 'Resumen anual de retenciones por alquileres',
      description:
        'Resumen anual de las retenciones e ingresos a cuenta sobre rentas de arrendamiento de inmuebles urbanos.',
      tags: ['alquiler', 'anual', 'retenciones'],
      keywords: [
        'alquiler',
        'alquileres',
        'arrendamiento',
        'anual',
        'resumen',
        'retenciones',
        'inmueble',
      ],
    },
    {
      code: '190',
      label: 'Modelo 190',
      title: 'Resumen anual de retenciones del IRPF',
      description:
        'Resumen anual de retenciones e ingresos a cuenta del IRPF sobre rendimientos del trabajo y actividades económicas.',
      tags: ['anual', 'retenciones', 'nóminas'],
      keywords: [
        'anual',
        'resumen',
        'retenciones',
        'irpf',
        'nóminas',
        'nomina',
        'trabajadores',
        'profesionales',
      ],
    },
    {
      code: '193',
      label: 'Modelo 193',
      title: 'Retenciones sobre rendimientos del capital mobiliario',
      description:
        'Declaración de retenciones sobre dividendos, intereses y otras rentas del capital mobiliario.',
      tags: ['dividendos', 'intereses', 'inversiones'],
      keywords: [
        'dividendos',
        'intereses',
        'capital mobiliario',
        'retenciones',
        'inversiones',
        'irpf',
      ],
    },
    {
      code: '200',
      label: 'Modelo 200',
      title: 'Impuesto sobre Sociedades',
      description:
        'Declaración anual del Impuesto sobre Sociedades de las entidades que tributan por este impuesto.',
      tags: ['sociedades', 'empresa', 'anual'],
      keywords: [
        'sociedades',
        'impuesto sociedades',
        'is',
        'anual',
        'empresa',
        'sl',
        'sa',
      ],
    },
    {
      code: '202',
      label: 'Modelo 202',
      title: 'Pago fraccionado del Impuesto sobre Sociedades',
      description:
        'Pagos a cuenta trimestrales del Impuesto sobre Sociedades.',
      tags: ['sociedades', 'trimestral', 'empresa'],
      keywords: [
        'sociedades',
        'impuesto sociedades',
        'is',
        'pago fraccionado',
        'trimestral',
        'empresa',
      ],
    },
    {
      code: '233',
      label: 'Modelo 233',
      title: 'Impuesto sobre el Patrimonio',
      description:
        'Declaración anual del Impuesto sobre el Patrimonio para personas y entidades obligadas.',
      tags: ['patrimonio', 'anual', 'bienes'],
      keywords: ['patrimonio', 'anual', 'bienes', 'activos'],
    },
    {
      code: '303',
      label: 'Modelo 303',
      title: 'Autoliquidación trimestral del IVA',
      description:
        'Declaración trimestral del IVA: IVA devengado, IVA deducible y resultado a ingresar o compensar.',
      tags: ['iva', 'trimestral', 'deducible'],
      keywords: [
        'iva',
        'trimestral',
        'autoliquidación',
        'autoliquidacion',
        'impuesto valor añadido',
        'deducible',
      ],
    },
    {
      code: '347',
      label: 'Modelo 347',
      title: 'Declaración anual de operaciones con terceros',
      description:
        'Relación anual de operaciones con clientes y proveedores por importes superiores al umbral legal.',
      tags: ['terceros', 'clientes', 'proveedores'],
      keywords: [
        'terceros',
        'operaciones',
        'clientes',
        'proveedores',
        'anual',
      ],
    },
    {
      code: '349',
      label: 'Modelo 349',
      title: 'Operaciones intracomunitarias',
      description:
        'Declaración recapitulativa de entregas, adquisiciones y otras operaciones con empresas de la UE.',
      tags: ['intracomunitarias', 'iva', 'europa'],
      keywords: [
        'intracomunitarias',
        'intracomunitaria',
        'europa',
        'ue',
        'iva',
        'exportación',
        'importación',
      ],
    },
    {
      code: '390',
      label: 'Modelo 390',
      title: 'Resumen anual del IVA',
      description:
        'Resumen anual del IVA con el total de las autoliquidaciones presentadas durante el ejercicio.',
      tags: ['iva', 'anual', 'resumen'],
      keywords: ['iva', 'anual', 'resumen', 'autoliquidación', 'autoliquidacion'],
    },
  ] satisfies FiscalModelGuideEntry[],
} as const

export type FiscalModelsGuide = typeof fiscalModelsGuide
