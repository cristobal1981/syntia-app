/**
 * Organismo que administra el modelo: la mayoría son estatales (AEAT), pero
 * el IGIC (415/417/420/421/425) es un impuesto canario que gestiona la
 * Agencia Tributaria Canaria (ATC) — un organismo distinto, con su propia
 * sede electrónica. Enlazar los modelos IGIC a la sede de la AEAT sería
 * incorrecto: un cliente que fuera a verificarlo llegaría al portal
 * equivocado.
 */
export type FiscalModelAuthority = 'aeat' | 'atc'

export type FiscalModelGuideEntry = {
  code: string
  label: string
  title: string
  description: string
  authority: FiscalModelAuthority
  /**
   * Quién debe presentarlo y plazo de presentación — piloto en curso,
   * verificado a mano contra la sede de la AEAT/ATC (no todos los modelos
   * lo tienen todavía). Los plazos son del ejercicio 2026 y pueden variar
   * de un año a otro; revisar junto con `lastReviewedLabel` antes de fiarse
   * a ciegas de una fecha antigua.
   */
  whoFiles?: string
  deadline?: string
  /** Etiquetas visibles en la ficha */
  tags: readonly string[]
  /** Sinónimos y términos para búsqueda (guía y obligaciones) */
  keywords: readonly string[]
}

export const fiscalModelSources: Record<
  FiscalModelAuthority,
  { label: string; url: string }
> = {
  aeat: {
    label: 'Fuente: Agencia Tributaria (AEAT)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html',
  },
  atc: {
    label: 'Fuente: Agencia Tributaria Canaria (ATC)',
    url: 'https://sede.gobiernodecanarias.org/tributos/jsf/publico/sede/tramites/tramite.jsp?categoria=igic',
  },
}

export const fiscalModelsGuide = {
  title: 'Guía de modelos tributarios',
  searchLabel: 'Buscar en esta guía',
  searchPlaceholder: 'Ej.: alquiler, IVA, nóminas…',
  clearSearch: 'Borrar búsqueda',
  resultCountOne: '1 modelo encontrado',
  resultCountMany: '{count} modelos encontrados',
  noResultsTitle: 'Sin resultados',
  noResultsDescription:
    'No encontramos modelos relacionados con ese término. Prueba con otra palabra.',
  lastReviewedLabel: 'Última revisión: 14 de agosto de 2026',
  models: [
    {
      code: '100',
      label: 'Modelo 100',
      authority: 'aeat',
      title: 'Declaración anual del IRPF',
      description:
        'Declaración del Impuesto sobre la Renta de las Personas Físicas: resume ingresos, deducciones y resultado de la campaña de la renta.',
      whoFiles:
        'Con carácter general, si tus rendimientos del trabajo superan los 22.000 €/año de un único pagador, o los 15.876 €/año cuando vienen de varios pagadores y el segundo y siguientes suman en conjunto más de 1.500 €/año. Los autónomos deben declarar siempre, con independencia del importe.',
      deadline:
        'Del 8 de abril al 30 de junio (declaraciones con domiciliación bancaria del pago, hasta el 25 de junio).',
      tags: ['renta', 'anual', 'irpf', 'declaración de la renta'],
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
      authority: 'aeat',
      title: 'Retenciones e ingresos a cuenta del IRPF',
      description:
        'Declaración trimestral de retenciones practicadas a trabajadores, profesionales y otras rentas del trabajo o actividades económicas.',
      whoFiles:
        'Empresas y autónomos que pagan sueldos, nóminas o facturas a profesionales sujetas a retención de IRPF. Se presenta siempre, incluso si no se ha retenido ninguna cantidad en el trimestre.',
      deadline:
        'Del 1 al 20 de abril, julio, octubre y enero (los cuatro trimestres siguen el mismo plazo de 20 días, sin la ampliación a fin de mes que sí tienen los modelos de autoliquidación como el 130 o el 303).',
      tags: ['nóminas', 'retenciones', 'irpf', 'sueldos', 'profesionales'],
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
      authority: 'aeat',
      title: 'Retenciones por alquiler de inmuebles urbanos',
      description:
        'Declaración de retenciones e ingresos a cuenta del IRPF sobre rentas de arrendamiento de inmuebles en urbano.',
      whoFiles:
        'Empresas y autónomos que alquilan un local u oficina a un propietario persona física sujeto a IRPF: el inquilino retiene un porcentaje de la renta y lo ingresa en su nombre.',
      deadline:
        'Del 1 al 20 de abril, julio, octubre y enero (mensual, en los 20 primeros días de cada mes, para grandes empresas con volumen de operaciones superior a 6.010.121,04 €).',
      tags: ['alquiler', 'arrendamiento', 'retenciones', 'vivienda', 'irpf'],
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
      authority: 'aeat',
      title: 'Retenciones sobre determinados rendimientos del capital mobiliario',
      description:
        'Declaración trimestral de retenciones e ingresos a cuenta sobre determinados rendimientos del capital mobiliario: dividendos, intereses entre socio y empresa, y cánones de propiedad intelectual, entre otros.',
      whoFiles:
        'Personas físicas, entidades o empresas que pagan rendimientos de capital mobiliario sujetos a retención (dividendos, intereses entre socio y empresa, cánones de propiedad intelectual, entre otros).',
      deadline:
        'Del 1 al 20 de abril, julio, octubre y enero (mismo plazo de 20 días en los cuatro trimestres).',
      tags: ['capital mobiliario', 'dividendos', 'intereses', 'retenciones', 'cánones'],
      keywords: [
        'retenciones',
        'capital mobiliario',
        'dividendos',
        'intereses',
        'cánones',
        'propiedad intelectual',
        'socio y empresa',
        'irpf',
        'rendimientos',
      ],
    },
    {
      code: '130',
      label: 'Modelo 130',
      authority: 'aeat',
      title: 'Pago fraccionado del IRPF (estimación directa)',
      description:
        'Pago a cuenta trimestral del IRPF para autónomos y profesionales en estimación directa.',
      whoFiles:
        'Autónomos dados de alta en actividades empresariales en estimación directa (normal o simplificada). Los profesionales quedan exentos si al menos el 70 % de sus ingresos ya llevaron retención.',
      deadline:
        'Del 1 al 20 de abril, julio y octubre (1T, 2T y 3T); del 1 al 30 de enero para el cuarto trimestre.',
      tags: ['autónomos', 'irpf', 'trimestral', 'pago fraccionado', 'estimación directa'],
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
      authority: 'aeat',
      title: 'Pago fraccionado del IRPF (módulos)',
      description:
        'Pago a cuenta trimestral del IRPF para autónomos en estimación objetiva por módulos.',
      whoFiles:
        'Autónomos en estimación objetiva (módulos) por actividades empresariales incluidas en ese régimen.',
      deadline:
        'Del 1 al 20 de abril, julio y octubre (1T, 2T y 3T); del 1 al 30 de enero para el cuarto trimestre.',
      tags: ['autónomos', 'módulos', 'irpf', 'pago fraccionado', 'estimación objetiva'],
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
      authority: 'aeat',
      title: 'Resumen anual de retenciones por alquileres',
      description:
        'Resumen anual de las retenciones e ingresos a cuenta sobre rentas de arrendamiento de inmuebles urbanos.',
      whoFiles: 'Quien haya presentado el modelo 115 durante el año.',
      deadline: 'Del 1 al 31 de enero de cada año.',
      tags: ['alquiler', 'anual', 'retenciones', 'arrendamiento', 'resumen'],
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
      authority: 'aeat',
      title: 'Donativos, donaciones y aportaciones recibidas',
      description:
        'Declaración informativa anual de donativos, donaciones y aportaciones recibidas por entidades beneficiarias.',
      whoFiles:
        'La entidad que recibe el donativo (no quien dona): fundaciones, asociaciones declaradas de utilidad pública y entidades acogidas al régimen fiscal especial de la Ley 49/2002 (ONG, universidades, instituciones culturales o científicas).',
      deadline:
        'Del 1 al 31 de enero de cada año (o el siguiente día hábil si el 31 cae en fin de semana).',
      tags: ['donaciones', 'fundaciones', 'anual', 'ong', 'informativa'],
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
      authority: 'aeat',
      title: 'Entidades en régimen de atribución de rentas',
      description:
        'Declaración informativa anual de las entidades en régimen de atribución de rentas (comunidades de bienes, UTE, etc.).',
      whoFiles:
        'Entidades en régimen de atribución de rentas (comunidades de bienes, sociedades civiles, herencias yacentes) que ejerzan una actividad económica, o cuyas rentas superen los 3.000 €/año.',
      deadline:
        'Generalmente durante el mes de febrero (para el ejercicio 2025, del 1 de enero al 2 de febrero de 2026) — no sigue el mismo plazo de enero que otros resúmenes anuales, da tiempo a los socios a declarar antes de su propio IRPF.',
      tags: ['atribución', 'comunidades', 'anual', 'informativa', 'ute'],
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
      authority: 'aeat',
      title: 'Resumen anual de retenciones del IRPF',
      description:
        'Resumen anual de retenciones e ingresos a cuenta del IRPF sobre rendimientos del trabajo y actividades económicas.',
      whoFiles: 'Quien haya presentado el modelo 111 durante el año.',
      deadline: 'Del 1 al 31 de enero de cada año.',
      tags: ['anual', 'retenciones', 'nóminas', 'resumen', 'irpf'],
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
      authority: 'aeat',
      title: 'Resumen anual de retenciones del capital mobiliario',
      description:
        'Resumen anual de las retenciones e ingresos a cuenta sobre dividendos, intereses y otras rentas del capital mobiliario declaradas trimestralmente en el modelo 123.',
      whoFiles:
        'Quien haya presentado el modelo 123 durante el año: personas físicas, entidades o empresas que pagan rendimientos de capital mobiliario sujetos a retención.',
      deadline: 'Del 1 al 31 de enero de cada año.',
      tags: ['dividendos', 'intereses', 'inversiones', 'retenciones', 'irpf'],
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
      authority: 'aeat',
      title: 'Impuesto sobre Sociedades',
      description:
        'Declaración anual del Impuesto sobre Sociedades de las entidades que tributan por este impuesto.',
      whoFiles:
        'Entidades con residencia fiscal en España y personalidad jurídica propia: sociedades limitadas, anónimas, UTE, AIE, fondos de inversión y pensiones. Obligatorio aunque no haya habido actividad o el resultado sea negativo.',
      deadline:
        'Dentro de los 25 días naturales siguientes a los 6 meses tras el cierre del ejercicio. Para empresas con ejercicio natural, antes del 25 de julio del año siguiente.',
      tags: ['sociedades', 'empresa', 'anual', 'sl', 'sa'],
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
      authority: 'aeat',
      title: 'Pago fraccionado del Impuesto sobre Sociedades',
      description:
        'Pagos a cuenta trimestrales del Impuesto sobre Sociedades.',
      whoFiles:
        'Entidades sujetas al Impuesto sobre Sociedades obligadas a realizar pagos fraccionados a cuenta de la declaración anual (modelo 200).',
      deadline:
        'No es realmente trimestral pese al nombre: se paga en los 20 primeros días naturales de abril, octubre y diciembre de cada año (no en enero).',
      tags: ['sociedades', 'trimestral', 'empresa', 'pago fraccionado'],
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
      authority: 'aeat',
      title: 'Retenciones del IRNR (sin establecimiento permanente)',
      description:
        'Declaración-documento de ingreso de retenciones e ingresos a cuenta del IRNR sobre rentas obtenidas sin establecimiento permanente.',
      whoFiles:
        'Quien resida en España (o tenga establecimiento permanente aquí) y pague rentas sujetas a IRNR a personas o entidades extranjeras sin establecimiento permanente: autónomos, sociedades, entidades en atribución de rentas.',
      deadline:
        'Del 1 al 20 de abril, julio, octubre y enero (mismo plazo de 20 días en los cuatro trimestres); mensual para grandes empresas.',
      tags: ['no residentes', 'retenciones', 'irnr', 'extranjeros'],
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
      authority: 'aeat',
      title: 'Gastos en guarderías o centros de educación infantil',
      description:
        'Declaración informativa anual de los gastos por la escolarización de menores de tres años, para que las familias puedan aplicar el incremento de la deducción por maternidad.',
      whoFiles:
        'Guarderías y centros de educación infantil autorizados. Los padres o tutores no deben presentarla en ningún caso — la presenta el centro.',
      deadline: 'Del 1 al 31 de enero de cada año.',
      tags: ['guarderías', 'educación infantil', 'maternidad', 'anual', 'informativa'],
      keywords: [
        'guarderías',
        'guarderia',
        'educación infantil',
        'deducción por maternidad',
        'menores de tres años',
        'escolarización',
        'informativa',
      ],
    },
    {
      code: '296',
      label: 'Modelo 296',
      authority: 'aeat',
      title: 'Resumen anual de retenciones del IRNR',
      description:
        'Resumen anual de retenciones e ingresos a cuenta del IRNR practicados a no residentes sin establecimiento permanente.',
      whoFiles: 'Quien haya presentado el modelo 216 durante el año.',
      deadline: 'Del 1 al 31 de enero de cada año.',
      tags: ['no residentes', 'anual', 'irnr', 'resumen', 'extranjeros'],
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
      authority: 'aeat',
      title: 'Autoliquidación trimestral del IVA',
      description:
        'Declaración trimestral del IVA: IVA devengado, IVA deducible y resultado a ingresar o compensar.',
      whoFiles:
        'Cualquier autónomo o empresa que realice una actividad sujeta a IVA, incluidos arrendadores y promotores inmobiliarios. Se presenta siempre, incluso sin actividad o con resultado a cero.',
      deadline:
        'Del 1 al 20 de abril, julio y octubre (1T, 2T y 3T); del 1 al 30 de enero para el cuarto trimestre.',
      tags: ['iva', 'trimestral', 'deducible', 'autoliquidación'],
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
      authority: 'aeat',
      title: 'Autoliquidación no periódica del IVA',
      description:
        'Liquidación puntual del IVA en supuestos especiales: adquisiciones intracomunitarias, inversión del sujeto pasivo u operaciones concretas sin declaración periódica del 303.',
      whoFiles:
        'Quien no presenta el modelo 303 periódico pero realiza operaciones puntuales sujetas a IVA: importaciones, adquisiciones intracomunitarias, operaciones ocasionales de no establecidos, o rectificaciones de IVA de un periodo anterior.',
      deadline:
        'Del 1 al 20 de abril, julio y octubre (1T, 2T y 3T); del 1 al 30 de enero para el cuarto trimestre — mismo esquema que el modelo 303.',
      tags: ['iva', 'intracomunitarias', 'especial', 'inversión sujeto pasivo'],
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
      authority: 'aeat',
      title: 'Operaciones incluidas en los libros registro',
      description:
        'Declaración informativa del detalle de operaciones anotadas en los libros registro de IVA o IGIC (facturas, intracomunitarias, bienes de inversión).',
      whoFiles:
        'Desde julio de 2017 solo aplica en la práctica a sujetos pasivos del IGIC inscritos en el Registro de Devolución Mensual — los del IVA peninsular en REDEME ya no lo presentan, usan el SII en su lugar.',
      deadline:
        'Mensual, acompañando al modelo periódico correspondiente: como fecha máxima, el día 20 de cada mes.',
      tags: ['libros registro', 'informativa', 'facturas', 'igic', 'mensual'],
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
      authority: 'aeat',
      title: 'Declaración anual de operaciones con terceros',
      description:
        'Relación anual de operaciones con clientes y proveedores por importes superiores al umbral legal.',
      whoFiles:
        'Autónomos y empresas que hayan facturado más de 3.005,06 € (IVA incluido) con un mismo cliente o proveedor durante el año, sumando todas las operaciones con esa persona o entidad.',
      deadline:
        'Durante todo el mes de febrero, en relación con las operaciones del año natural anterior (o el siguiente día hábil si el último día de febrero cae en fin de semana).',
      tags: ['terceros', 'clientes', 'proveedores', 'anual', 'operaciones'],
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
      authority: 'aeat',
      title: 'Operaciones intracomunitarias',
      description:
        'Declaración recapitulativa de entregas, adquisiciones y otras operaciones con empresas de la UE.',
      whoFiles:
        'Autónomos y empresas que realizan entregas o adquisiciones intracomunitarias de bienes o determinadas prestaciones de servicios con otros países de la UE.',
      deadline:
        'Trimestral por defecto (1-20 del mes siguiente al trimestre) mientras no se superen 50.000 € en entregas intracomunitarias en el trimestre actual ni en los 4 anteriores; mensual si se supera ese umbral. Ya no existe la opción de presentarlo con periodicidad anual.',
      tags: ['intracomunitarias', 'iva', 'europa', 'exportación', 'importación'],
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
      authority: 'aeat',
      title: 'Regímenes especiales de ventanilla única (IVA)',
      description:
        'Declaración-liquidación periódica de los regímenes OSS/IOSS: ventas a distancia y servicios a consumidores finales en la UE.',
      whoFiles:
        'Empresarios y profesionales de ecommerce acogidos a OSS o IOSS cuya facturación de ventas o servicios digitales a particulares de otros países de la UE supera los 10.000 €/año.',
      deadline:
        'OSS: trimestral, durante todo el mes natural siguiente al trimestre declarado. IOSS: mensual, durante todo el mes natural siguiente al mes declarado. Obligatorio aunque no haya habido operaciones en el periodo.',
      tags: ['ecommerce', 'ventanilla única', 'iva', 'ventas a distancia', 'oss'],
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
      authority: 'aeat',
      title: 'Resumen anual del IVA',
      description:
        'Resumen anual del IVA con el total de las autoliquidaciones presentadas durante el ejercicio.',
      whoFiles:
        'Quien haya presentado el modelo 303 durante el año en régimen general, salvo quienes están en el SII (lo sustituye), en recargo de equivalencia, o autónomos en módulos sin operaciones fuera del módulo.',
      deadline: 'Del 1 al 30 de enero de cada año.',
      tags: ['iva', 'anual', 'resumen', 'autoliquidación'],
      keywords: ['iva', 'anual', 'resumen', 'autoliquidación', 'autoliquidacion'],
    },
    {
      code: '415',
      label: 'Modelo 415',
      authority: 'atc',
      title: 'Operaciones con terceros (IGIC · Canarias)',
      description:
        'Declaración informativa anual de operaciones con clientes y proveedores sujetas al IGIC en Canarias por importes superiores al umbral legal.',
      whoFiles:
        'Empresarios y profesionales que hayan realizado operaciones con un mismo cliente o proveedor por importe superior a 3.005,06 € durante el año natural, en el ámbito del IGIC.',
      deadline:
        'Durante todo el mes de febrero de cada año, en relación con las operaciones del año natural anterior.',
      tags: ['igic', 'canarias', 'terceros', 'anual', 'informativa'],
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
      authority: 'atc',
      title: 'Autoliquidación del IGIC con SII (Canarias)',
      description:
        'Autoliquidación del IGIC para sujetos pasivos obligados o acogidos al Suministro Inmediato de Información en Canarias.',
      whoFiles:
        'Sujetos pasivos del IGIC obligados a llevar los libros registro del impuesto mediante el Suministro Inmediato de Información (SII) en la sede electrónica de la ATC, o que lo hayan elegido voluntariamente, salvo los acogidos al régimen especial de grupo de entidades.',
      deadline:
        'Mensual, dentro del mes natural siguiente al periodo de liquidación. Desde el 1 de enero de 2025 la periodicidad es exclusivamente mensual para todos los obligados al SII.',
      tags: ['igic', 'canarias', 'sii', 'suministro inmediato'],
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
      authority: 'atc',
      title: 'Autoliquidación trimestral del IGIC (Canarias)',
      description:
        'Declaración-liquidación trimestral del IGIC en régimen general para sujetos pasivos en Canarias.',
      whoFiles:
        'Empresarios y profesionales que realizan actividades económicas sujetas al IGIC en Canarias y tributan en el régimen general (no acogidos al simplificado).',
      deadline:
        'Del 1 al 20 de abril, julio y octubre (1T, 2T y 3T); del 1 al 30 de enero para el cuarto trimestre.',
      tags: ['igic', 'canarias', 'trimestral', 'régimen general'],
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
      authority: 'atc',
      title: 'IGIC en régimen simplificado (Canarias)',
      description:
        'Autoliquidación trimestral del IGIC para sujetos pasivos acogidos al régimen especial simplificado en Canarias.',
      whoFiles:
        'Empresarios y profesionales que tributan por el IGIC en el Régimen Especial Simplificado (equivalente canario de módulos) para las actividades incluidas en dicho régimen, siempre que no hayan superado los límites de exclusión del año anterior.',
      deadline:
        'Del 1 al 20 de abril, julio y octubre (1T, 2T y 3T); el cuarto trimestre se presenta durante todo el mes de enero del año siguiente.',
      tags: ['igic', 'canarias', 'simplificado', 'autónomos', 'trimestral'],
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
      authority: 'atc',
      title: 'Resumen anual del IGIC (Canarias)',
      description:
        'Resumen anual del IGIC con el total de las autoliquidaciones presentadas durante el ejercicio en Canarias.',
      whoFiles:
        'Todos los sujetos pasivos del IGIC obligados a presentar autoliquidaciones periódicas del impuesto (modelos 420, 421 o 417), así como los acogidos al REPEP, que solo cumplimentan las casillas informativas de volumen de operaciones de ese régimen especial.',
      deadline:
        'Del 1 al 31 de enero de cada año (o el siguiente día hábil si el 31 cae en inhábil), junto con la última autoliquidación del ejercicio.',
      tags: ['igic', 'canarias', 'anual', 'resumen'],
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
