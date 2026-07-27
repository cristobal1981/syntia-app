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
    'Para qué sirve cada modelo fiscal y en qué situaciones suele presentarse. Si tienes dudas sobre tu caso concreto, tu asesor te orientará.',
  backLabel: 'Volver',
  searchLabel: 'Buscar en la guía',
  searchPlaceholder: 'Ej.: alquiler, IVA, nóminas…',
  noResultsTitle: 'Sin resultados',
  noResultsDescription:
    'No encontramos modelos relacionados con ese término. Prueba con otra palabra.',
  models: [
    {
      code: '100',
      label: 'Modelo 100',
      title: 'Declaración anual del IRPF',
      description:
        'Declaración del Impuesto sobre la Renta de las Personas Físicas: resume ingresos, deducciones y resultado de la campaña de la renta.',
      tags: ['renta', 'anual', 'irpf'],
      keywords: [
        'renta',
        'irpf',
        'declaración',
        'anual',
        'campaña',
        'personas físicas',
        'declaración de la renta',
      ],
    },
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
      code: '182',
      label: 'Modelo 182',
      title: 'Donativos, donaciones y aportaciones recibidas',
      description:
        'Declaración informativa anual de donativos, donaciones y aportaciones recibidas por entidades beneficiarias.',
      tags: ['donaciones', 'fundaciones', 'anual'],
      keywords: [
        'donativos',
        'donaciones',
        'aportaciones',
        'fundaciones',
        'ong',
        'entidades sin ánimo de lucro',
        'informativa',
      ],
    },
    {
      code: '184',
      label: 'Modelo 184',
      title: 'Entidades en régimen de atribución de rentas',
      description:
        'Declaración informativa anual de las entidades en régimen de atribución de rentas (comunidades de bienes, UTE, etc.).',
      tags: ['atribución', 'comunidades', 'anual'],
      keywords: [
        'atribución de rentas',
        'comunidades de bienes',
        'ute',
        'cb',
        'entidades',
        'informativa',
        'anual',
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
      code: '216',
      label: 'Modelo 216',
      title: 'Retenciones del IRNR (sin establecimiento permanente)',
      description:
        'Declaración-documento de ingreso de retenciones e ingresos a cuenta del IRNR sobre rentas obtenidas sin establecimiento permanente.',
      tags: ['no residentes', 'retenciones', 'irnr'],
      keywords: [
        'irnr',
        'no residentes',
        'retenciones',
        'extranjeros',
        'sin establecimiento permanente',
        'ingresos a cuenta',
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
      code: '296',
      label: 'Modelo 296',
      title: 'Resumen anual de retenciones del IRNR',
      description:
        'Resumen anual de retenciones e ingresos a cuenta del IRNR practicados a no residentes sin establecimiento permanente.',
      tags: ['no residentes', 'anual', 'irnr'],
      keywords: [
        'irnr',
        'no residentes',
        'anual',
        'resumen',
        'retenciones',
        'extranjeros',
        'informativa',
      ],
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
      code: '309',
      label: 'Modelo 309',
      title: 'Autoliquidación no periódica del IVA',
      description:
        'Liquidación puntual del IVA en supuestos especiales: adquisiciones intracomunitarias, inversión del sujeto pasivo u operaciones concretas sin declaración periódica del 303.',
      tags: ['iva', 'intracomunitarias', 'especial'],
      keywords: [
        'iva',
        'no periódico',
        'intracomunitarias',
        'recargo equivalencia',
        'agricultura',
        'inversión sujeto pasivo',
        'autoliquidación',
      ],
    },
    {
      code: '340',
      label: 'Modelo 340',
      title: 'Operaciones incluidas en los libros registro',
      description:
        'Declaración informativa del detalle de operaciones anotadas en los libros registro de IVA o IGIC (facturas, intracomunitarias, bienes de inversión).',
      tags: ['libros registro', 'informativa', 'facturas'],
      keywords: [
        'libros registro',
        'facturas',
        'informativa',
        'redeeme',
        'igic',
        'mensual',
        'intracomunitarias',
        'bienes de inversión',
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
      code: '369',
      label: 'Modelo 369',
      title: 'Regímenes especiales de ventanilla única (IVA)',
      description:
        'Declaración-liquidación periódica de los regímenes OSS/IOSS: ventas a distancia y servicios a consumidores finales en la UE.',
      tags: ['ecommerce', 'ventanilla única', 'iva'],
      keywords: [
        'oss',
        'ioss',
        'ventanilla única',
        'comercio electrónico',
        'ventas a distancia',
        'ue',
        'europa',
        'servicios',
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
    {
      code: '415',
      label: 'Modelo 415',
      title: 'Operaciones con terceros (IGIC · Canarias)',
      description:
        'Declaración informativa anual de operaciones con clientes y proveedores sujetas al IGIC en Canarias por importes superiores al umbral legal.',
      tags: ['igic', 'canarias', 'terceros'],
      keywords: [
        'igic',
        'canarias',
        'terceros',
        'operaciones',
        'clientes',
        'proveedores',
        'anual',
        'informativa',
      ],
    },
    {
      code: '417',
      label: 'Modelo 417',
      title: 'Autoliquidación del IGIC con SII (Canarias)',
      description:
        'Autoliquidación del IGIC para sujetos pasivos obligados o acogidos al Suministro Inmediato de Información en Canarias.',
      tags: ['igic', 'canarias', 'sii'],
      keywords: [
        'igic',
        'canarias',
        'sii',
        'suministro inmediato',
        'autoliquidación',
        'atc',
      ],
    },
    {
      code: '420',
      label: 'Modelo 420',
      title: 'Autoliquidación trimestral del IGIC (Canarias)',
      description:
        'Declaración-liquidación trimestral del IGIC en régimen general para sujetos pasivos en Canarias.',
      tags: ['igic', 'canarias', 'trimestral'],
      keywords: [
        'igic',
        'canarias',
        'trimestral',
        'régimen general',
        'autoliquidación',
        'atc',
      ],
    },
    {
      code: '421',
      label: 'Modelo 421',
      title: 'IGIC en régimen simplificado (Canarias)',
      description:
        'Autoliquidación trimestral del IGIC para sujetos pasivos acogidos al régimen especial simplificado en Canarias.',
      tags: ['igic', 'canarias', 'simplificado'],
      keywords: [
        'igic',
        'canarias',
        'simplificado',
        'autónomos',
        'trimestral',
        'autoliquidación',
        'atc',
      ],
    },
    {
      code: '425',
      label: 'Modelo 425',
      title: 'Resumen anual del IGIC (Canarias)',
      description:
        'Resumen anual del IGIC con el total de las autoliquidaciones presentadas durante el ejercicio en Canarias.',
      tags: ['igic', 'canarias', 'anual'],
      keywords: [
        'igic',
        'canarias',
        'anual',
        'resumen',
        'autoliquidación',
        'atc',
      ],
    },
  ] satisfies FiscalModelGuideEntry[],
} as const

export type FiscalModelsGuide = typeof fiscalModelsGuide
