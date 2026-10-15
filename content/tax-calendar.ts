type MonthDay = {
  /** Mes 1–12 */
  month: number
  day: number
}

export type TaxCalendarWindow = {
  id: string
  title: string
  /** Copia mostrada al usuario; las fechas solo determinan el resaltado */
  rangeLabel: string
  /** Inclusive. Una ventana nunca cruza el cambio de año */
  start: MonthDay
  end: MonthDay
  /** Códigos de content/fiscal-models-guide.ts */
  modelCodes: readonly string[]
  /** Slugs de content/guias.ts */
  guideSlugs: readonly string[]
  /**
   * Trimestre natural (1–4) que cubre esta ventana. Puede haber más de una
   * ventana para el mismo trimestre (p. ej. el 4T tiene un plazo distinto
   * para IVA/IGIC que para retenciones) — `undefined` en ventanas anuales.
   */
  quarter?: 1 | 2 | 3 | 4
  /**
   * Número de periodo para los modelos que no se declaran por trimestre
   * natural sino por «Periodo N» (hoy solo el 202, pagos fraccionados de
   * Sociedades: 1P abril, 2P octubre, 3P diciembre). `undefined` en el resto.
   */
  period?: 1 | 2 | 3
  /**
   * Último día propio de un modelo cuando difiere del `end` de la ventana (p.
   * ej. el 369 acaba el último día del mes siguiente al trimestre, y el IGIC
   * del 4T el 31 de enero). El resto de modelos de la ventana usa `end`. Las
   * fechas solo cambian el plazo calculado, no el resaltado de la guía.
   */
  endByModel?: Readonly<Record<string, MonthDay>>
}

/*
 * Calendario fiscal recurrente (agnóstico del año). Los días exactos pueden
 * desplazarse por festivos o fines de semana; el rangeLabel es orientativo.
 */
export const taxCalendar = {
  windows: [
    {
      id: 't4',
      title: 'Declaraciones del 4º trimestre (IVA/IGIC y pagos fraccionados)',
      rangeLabel: 'Del 1 al 30 de enero (IGIC y ventanilla única, hasta el 31)',
      start: { month: 1, day: 1 },
      end: { month: 1, day: 30 },
      // Plazo ampliado hasta el 30 (AEAT): IVA, pagos fraccionados del IRPF e
      // intracomunitarias. El IGIC (ATC) y la ventanilla única (369) acaban el 31.
      modelCodes: ['303', '309', '130', '131', '349', '420', '421', '412', '369'],
      endByModel: {
        '420': { month: 1, day: 31 },
        '421': { month: 1, day: 31 },
        '412': { month: 1, day: 31 },
        '369': { month: 1, day: 31 },
      },
      guideSlugs: ['cierre-trimestral-impuestos'],
      quarter: 4,
    },
    {
      id: 't4-retenciones',
      title: 'Declaraciones del 4º trimestre (retenciones)',
      rangeLabel: 'Del 1 al 20 de enero',
      start: { month: 1, day: 1 },
      end: { month: 1, day: 20 },
      // Sin plazo ampliado: las retenciones acaban el 20 (130 y 131 sí llegan al 30).
      modelCodes: ['111', '115', '123', '216'],
      guideSlugs: ['cierre-trimestral-impuestos'],
      quarter: 4,
    },
    {
      id: 'resumenes-anuales',
      title: 'Resúmenes anuales',
      rangeLabel: 'Del 1 al 31 de enero',
      start: { month: 1, day: 1 },
      end: { month: 1, day: 31 },
      // El 390 acaba el 30 (AEAT); el resto de resúmenes e informativas el 31.
      modelCodes: ['390', '190', '180', '193', '296', '182', '184', '233', '425'],
      endByModel: { '390': { month: 1, day: 30 } },
      guideSlugs: ['resumenes-anuales-enero'],
    },
    {
      id: 'feb-347',
      title: 'Operaciones con terceros (347 y 415)',
      rangeLabel: 'Del 1 al 28 de febrero',
      start: { month: 2, day: 1 },
      end: { month: 2, day: 28 },
      modelCodes: ['347', '415'],
      guideSlugs: ['declaracion-347'],
    },
    {
      id: 't1',
      title: 'Declaraciones del 1er trimestre',
      rangeLabel: 'Del 1 al 20 de abril',
      start: { month: 4, day: 1 },
      end: { month: 4, day: 20 },
      modelCodes: [
        '303', '309', '111', '115', '123', '216', '130', '131', '349',
        '420', '421', '412', '202', '369',
      ],
      endByModel: { '369': { month: 4, day: 30 } },
      guideSlugs: ['cierre-trimestral-impuestos'],
      quarter: 1,
      // El 1P del 202 cae en esta misma ventana.
      period: 1,
    },
    {
      id: 'renta',
      title: 'Campaña de la Renta',
      rangeLabel: 'Del 8 de abril al 30 de junio',
      start: { month: 4, day: 8 },
      end: { month: 6, day: 30 },
      modelCodes: ['100'],
      guideSlugs: ['campana-renta'],
    },
    {
      id: 't2',
      title: 'Declaraciones del 2º trimestre',
      rangeLabel: 'Del 1 al 20 de julio',
      start: { month: 7, day: 1 },
      end: { month: 7, day: 20 },
      modelCodes: [
        '303', '309', '111', '115', '123', '216', '130', '131', '349',
        '420', '421', '412', '369',
      ],
      endByModel: { '369': { month: 7, day: 31 } },
      guideSlugs: ['cierre-trimestral-impuestos'],
      quarter: 2,
    },
    {
      id: 'sociedades',
      title: 'Impuesto sobre Sociedades',
      rangeLabel: 'Del 1 al 25 de julio',
      start: { month: 7, day: 1 },
      end: { month: 7, day: 25 },
      modelCodes: ['200'],
      guideSlugs: ['impuesto-sociedades'],
    },
    {
      id: 't3',
      title: 'Declaraciones del 3er trimestre',
      rangeLabel: 'Del 1 al 20 de octubre',
      start: { month: 10, day: 1 },
      end: { month: 10, day: 20 },
      modelCodes: [
        '303', '309', '111', '115', '123', '216', '130', '131', '349',
        '420', '421', '412', '202', '369',
      ],
      endByModel: { '369': { month: 10, day: 31 } },
      guideSlugs: ['cierre-trimestral-impuestos'],
      quarter: 3,
      // El 2P del 202 cae en esta misma ventana.
      period: 2,
    },
    {
      id: 'pago-fraccionado-sociedades-3p',
      title: 'Pago fraccionado de Sociedades (3P)',
      rangeLabel: 'Del 1 al 20 de diciembre',
      start: { month: 12, day: 1 },
      end: { month: 12, day: 20 },
      modelCodes: ['202'],
      guideSlugs: ['impuesto-sociedades'],
      period: 3,
    },
  ],
} as const satisfies { windows: readonly TaxCalendarWindow[] }
