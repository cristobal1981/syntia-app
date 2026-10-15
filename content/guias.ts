export type GuideCategoryId =
  | 'impuestos-periodicos'
  | 'campanas-anuales'
  | 'autonomos-y-empresa'
  | 'referencia'

type GuideSection = {
  heading?: string
  paragraphs?: readonly string[]
  bullets?: readonly string[]
}

export type GuideEntry = {
  slug: string
  /** 'fiscal-models' renderiza la guía interactiva de modelos AEAT */
  kind: 'article' | 'fiscal-models'
  title: string
  description: string
  category: GuideCategoryId
  /** Hasta 3 etiquetas visibles en la ficha */
  tags: readonly string[]
  /** Sinónimos y términos para búsqueda */
  keywords: readonly string[]
  /** Códigos de content/fiscal-models-guide.ts */
  relatedModelCodes?: readonly string[]
  /** Ids de content/tax-calendar.ts */
  calendarWindowIds?: readonly string[]
  /** Obligatorio cuando kind === 'article' */
  sections?: readonly GuideSection[]
}

export const guias = {
  hub: {
    title: 'Guías',
    description:
      'Guías prácticas sobre impuestos, plazos y trámites habituales. Si tienes dudas sobre tu caso concreto, tu asesor te orientará.',
    nowTitle: 'Ahora toca',
    nowDescription: 'Plazos abiertos o a punto de abrirse.',
    /** Bocadillo de Sappo sobre el plazo más urgente. {subject} = modelos o título. */
    sappo: {
      activeToday: 'Conste en acta: hoy es el último día para presentar {subject}.',
      activeOne: 'Conste en acta: queda 1 día para presentar {subject}.',
      activeMany: 'Conste en acta: quedan {days} días para presentar {subject}.',
      upcomingOne: 'Atención: mañana se abre el plazo para presentar {subject}.',
      upcomingMany: 'Atención: en {days} días se abre el plazo para presentar {subject}.',
      oneModel: 'el modelo {codes}',
      manyModels: 'los modelos {codes}',
      moreModels: 'y otros {count}',
    },
    activeBadge: 'Plazo abierto',
    upcomingBadge: 'Empieza pronto',
    relatedGuidesLabel: 'Guías relacionadas',
    relatedModelsLabel: 'Modelos',
    allTitle: 'Todas las guías',
    readGuide: 'Leer guía',
  },
  detail: {
    backToHub: 'Volver a guías',
    relatedModelsTitle: 'Modelos relacionados',
    deadlinesTitle: 'Plazos habituales',
  },
  categories: {
    'impuestos-periodicos': 'Impuestos periódicos',
    'campanas-anuales': 'Campañas anuales',
    'autonomos-y-empresa': 'Autónomos y empresa',
    referencia: 'Referencia',
  } satisfies Record<GuideCategoryId, string>,
  entries: [
    {
      slug: 'modelos-aeat',
      kind: 'fiscal-models',
      title: 'Guía de modelos tributarios',
      description:
        'Para qué sirve cada modelo fiscal y en qué situaciones suele presentarse. Busca por modelo, impuesto o palabra clave.',
      category: 'referencia',
      tags: ['modelos', 'aeat', 'referencia'],
      keywords: ['modelos', 'aeat', 'iva', 'irpf', 'tributario', 'hacienda', 'guía'],
    },
    {
      slug: 'cierre-trimestral-impuestos',
      kind: 'article',
      title: 'Cierre trimestral: IVA y retenciones',
      description:
        'Qué se presenta cada trimestre, qué documentación necesita tu asesoría y cómo prepararte para que el cierre sea rápido.',
      category: 'impuestos-periodicos',
      tags: ['trimestral', 'iva', 'retenciones'],
      keywords: [
        'trimestre',
        'cierre',
        'iva',
        'retenciones',
        'autoliquidación',
        'facturas',
        'plazo',
        '303',
        '111',
        '115',
      ],
      relatedModelCodes: ['303', '111', '115', '130', '131', '349', '420'],
      calendarWindowIds: ['t1', 't2', 't3', 't4', 't4-retenciones'],
      sections: [
        {
          heading: 'Qué se presenta cada trimestre',
          paragraphs: [
            'Al cerrar cada trimestre natural se presentan las autoliquidaciones periódicas: el IVA (modelo 303) y, si procede, las retenciones practicadas a trabajadores y profesionales (modelo 111), las retenciones por alquileres (modelo 115) y los pagos fraccionados de IRPF para autónomos (modelos 130 o 131).',
            'El plazo general es del 1 al 20 del mes siguiente al cierre del trimestre (abril, julio y octubre). El cuarto trimestre se presenta en enero con plazos distintos: las retenciones (modelos 111, 115 y 123) hasta el día 20; el IVA (303), los pagos fraccionados del IRPF (130 y 131) y las operaciones intracomunitarias (349) hasta el día 30; y el IGIC canario (420 y 421) hasta el 31.',
            'Si domicilias el pago, el plazo termina antes: hasta el 15 de abril, julio y octubre, y en torno al 25 de enero. Cuando el último día cae en fin de semana o festivo, pasa al siguiente día hábil.',
          ],
        },
        {
          heading: 'Qué necesita tu asesoría',
          bullets: [
            'Todas las facturas emitidas y recibidas del trimestre.',
            'Justificantes de gastos deducibles (suministros, cuotas, seguros…).',
            'Movimientos bancarios relevantes si hay ingresos sin factura.',
            'Cualquier novedad: nuevas líneas de actividad, alquileres, contrataciones.',
          ],
        },
        {
          heading: 'Consejos para un cierre sin sustos',
          bullets: [
            'Sube la documentación a lo largo del trimestre, no la última semana.',
            'Revisa que no falte ninguna factura emitida: Hacienda cruza datos con tus clientes.',
            'Si un trimestre viene con resultado a pagar alto, tu asesor puede anticipártelo con margen.',
          ],
        },
      ],
    },
    {
      slug: 'resumenes-anuales-enero',
      kind: 'article',
      title: 'Resúmenes anuales de enero',
      description:
        'Además del cuarto trimestre, en enero se presentan los resúmenes informativos del año: IVA, retenciones, alquileres, capital mobiliario, no residentes e IGIC.',
      category: 'impuestos-periodicos',
      tags: ['anual', 'enero', 'resumen'],
      keywords: [
        'resumen anual',
        'enero',
        '390',
        '190',
        '180',
        '193',
        '296',
        '425',
        'informativa',
        'cierre del año',
      ],
      relatedModelCodes: ['390', '190', '180', '193', '296', '425'],
      calendarWindowIds: ['resumenes-anuales', 't4'],
      sections: [
        {
          heading: 'Qué son los resúmenes anuales',
          paragraphs: [
            'Son declaraciones informativas: no se paga nada con ellas, pero recapitulan todo lo declarado durante el año. El modelo 390 resume el IVA, el 190 las retenciones a trabajadores y profesionales, el 180 las retenciones por alquileres, el 193 las del capital mobiliario y el 296 las practicadas a no residentes. En Canarias, el resumen anual del IGIC es el modelo 425.',
            'El 390 se presenta hasta el 30 de enero y el resto hasta el 31. Si el último día cae en fin de semana, pasa al siguiente día hábil. Según tu caso, en esas fechas también se presentan otras informativas, como el 182 (donativos), el 184 (entidades en atribución de rentas) o el 233 (guarderías).',
            'Deben cuadrar con la suma de los cuatro trimestres, por eso se preparan junto al cierre del cuarto trimestre en enero.',
          ],
        },
        {
          heading: 'Qué revisar antes de que acabe el año',
          bullets: [
            'Que todas las facturas del ejercicio estén registradas.',
            'Los datos fiscales de trabajadores y profesionales a los que retienes.',
            'Los contratos de alquiler vigentes y sus importes anuales.',
          ],
        },
      ],
    },
    {
      slug: 'declaracion-347',
      kind: 'article',
      title: 'Declaración de operaciones con terceros (347)',
      description:
        'En febrero se declaran las operaciones con clientes o proveedores que superaron los 3.005,06 € durante el año anterior. En Canarias, las del IGIC van en el modelo 415.',
      category: 'impuestos-periodicos',
      tags: ['anual', 'febrero', 'informativa'],
      keywords: [
        '347',
        '415',
        'igic',
        'canarias',
        'terceros',
        'operaciones',
        'febrero',
        'proveedores',
        'clientes',
      ],
      relatedModelCodes: ['347', '415'],
      calendarWindowIds: ['feb-347'],
      sections: [
        {
          heading: 'Quién debe presentarlo',
          paragraphs: [
            'Empresas y autónomos que durante el año anterior hayan facturado o comprado a un mismo cliente o proveedor más de 3.005,06 € (IVA incluido). Se declara el importe total por cada tercero, desglosado por trimestres.',
            'El plazo es todo el mes de febrero (si el último día cae en fin de semana, pasa al siguiente día hábil). En Canarias, las operaciones sujetas a IGIC se declaran en el modelo 415 ante la Agencia Tributaria Canaria, con el mismo umbral y el mismo plazo.',
          ],
        },
        {
          heading: 'Por qué importa cuadrarlo',
          bullets: [
            'Hacienda cruza tu 347 con el de tus clientes y proveedores: las diferencias generan requerimientos.',
            'Conviene confirmar los importes con los terceros antes de presentar.',
            'Si ya presentas otras informativas con el mismo detalle (como el SII), puede no ser obligatorio: tu asesor te lo confirmará.',
          ],
        },
      ],
    },
    {
      slug: 'campana-renta',
      kind: 'article',
      title: 'Campaña de la Renta',
      description:
        'De abril a junio se presenta la declaración anual del IRPF. Qué documentación preparar y qué plazos tener en cuenta.',
      category: 'campanas-anuales',
      tags: ['renta', 'irpf', 'anual'],
      keywords: [
        'renta',
        'irpf',
        'campaña',
        'declaración',
        '100',
        'borrador',
        'devolución',
        'junio',
      ],
      relatedModelCodes: ['100'],
      calendarWindowIds: ['renta'],
      sections: [
        {
          heading: 'Fechas clave',
          paragraphs: [
            'La campaña arranca el 8 de abril con la presentación por internet y termina el 30 de junio. Si el resultado sale a pagar y quieres domiciliar el pago, el plazo se adelanta hasta el 25 de junio.',
          ],
        },
        {
          heading: 'Documentación que conviene preparar',
          bullets: [
            'Datos fiscales de AEAT y borrador (tu asesoría los descarga con tu autorización).',
            'Certificados de trabajo, pensiones o prestaciones.',
            'Ingresos y gastos de actividad si eres autónomo.',
            'Recibos de alquiler, hipoteca, donativos y otras deducciones.',
            'Operaciones con inversiones o criptomonedas, si las hay.',
          ],
        },
        {
          heading: 'Consejo',
          paragraphs: [
            'No esperes a junio: cuanto antes revises el borrador con tu asesor, antes se detectan deducciones aplicables y, si sale a devolver, antes cobras.',
          ],
        },
      ],
    },
    {
      slug: 'impuesto-sociedades',
      kind: 'article',
      title: 'Impuesto sobre Sociedades',
      description:
        'Las sociedades presentan en julio el impuesto sobre el beneficio del ejercicio anterior (modelo 200).',
      category: 'campanas-anuales',
      tags: ['sociedades', 'anual', 'julio'],
      keywords: [
        'sociedades',
        '200',
        'impuesto',
        'beneficio',
        'julio',
        'cuentas anuales',
        'sl',
      ],
      relatedModelCodes: ['200', '202'],
      calendarWindowIds: ['sociedades', 'pago-fraccionado-sociedades-3p'],
      sections: [
        {
          heading: 'Qué es y cuándo se presenta',
          paragraphs: [
            'El modelo 200 declara el resultado fiscal de la sociedad en el ejercicio anterior. Para ejercicios que coinciden con el año natural, el plazo va del 1 al 25 de julio.',
            'Antes deben estar cerradas y aprobadas las cuentas anuales: cierre contable, legalización de libros y depósito en el Registro Mercantil siguen su propio calendario en los meses previos.',
            'A lo largo del ejercicio se adelantan pagos fraccionados (modelo 202): del 1 al 20 de abril, octubre y diciembre (hasta el 15 si se domicilia el pago).',
          ],
        },
        {
          heading: 'Qué revisar con tu asesor',
          bullets: [
            'Ajustes fiscales sobre el resultado contable (gastos no deducibles, amortizaciones…).',
            'Deducciones e incentivos aplicables (I+D, reserva de capitalización…).',
            'Compensación de bases imponibles negativas de años anteriores.',
            'Pagos fraccionados ya realizados durante el ejercicio (modelo 202).',
          ],
        },
      ],
    },
    {
      slug: 'alta-autonomo',
      kind: 'article',
      title: 'Darse de alta como autónomo',
      description:
        'Los pasos del alta: censo de Hacienda, RETA en la Seguridad Social y las primeras obligaciones que llegan después.',
      category: 'autonomos-y-empresa',
      tags: ['autónomo', 'alta', 'inicio'],
      keywords: [
        'autónomo',
        'alta',
        'reta',
        '036',
        '037',
        'censo',
        'seguridad social',
        'tarifa plana',
        'empezar actividad',
      ],
      sections: [
        {
          heading: 'Los dos altas imprescindibles',
          paragraphs: [
            'Primero, el alta censal en Hacienda (modelo 036 o su versión simplificada) declarando la actividad, el epígrafe y el régimen de IVA e IRPF. Después, el alta en el RETA (Régimen Especial de Trabajadores Autónomos) de la Seguridad Social, que debe hacerse antes de iniciar la actividad.',
          ],
        },
        {
          heading: 'Qué decidir antes del alta',
          bullets: [
            'Epígrafe de actividad correcto: condiciona IVA, retenciones y obligaciones.',
            'Base de cotización y si aplica la tarifa plana para nuevos autónomos.',
            'Si trabajarás desde casa: qué parte de suministros podrá deducirse.',
          ],
        },
        {
          heading: 'Y después del alta',
          bullets: [
            'Facturar con los requisitos formales correctos desde el primer día.',
            'Presentar los impuestos trimestrales aunque el resultado sea cero.',
            'Guardar todas las facturas de gasto: sin factura no hay deducción.',
          ],
        },
      ],
    },
  ] satisfies readonly GuideEntry[],
} as const
