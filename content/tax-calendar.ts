export type MonthDay = {
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
}

/*
 * Calendario fiscal recurrente (agnóstico del año). Los días exactos pueden
 * desplazarse por festivos o fines de semana; el rangeLabel es orientativo.
 */
export const taxCalendar = {
  windows: [
    {
      id: 't4',
      title: 'Declaraciones del 4º trimestre',
      rangeLabel: 'Del 1 al 30 de enero',
      start: { month: 1, day: 1 },
      end: { month: 1, day: 30 },
      modelCodes: ['303', '111', '115', '123', '130', '131', '349'],
      guideSlugs: ['cierre-trimestral-impuestos'],
    },
    {
      id: 'resumenes-anuales',
      title: 'Resúmenes anuales',
      rangeLabel: 'Del 1 al 31 de enero',
      start: { month: 1, day: 1 },
      end: { month: 1, day: 31 },
      modelCodes: ['390', '190', '180'],
      guideSlugs: ['resumenes-anuales-enero'],
    },
    {
      id: 'feb-347',
      title: 'Operaciones con terceros (347)',
      rangeLabel: 'Del 1 al 28 de febrero',
      start: { month: 2, day: 1 },
      end: { month: 2, day: 28 },
      modelCodes: ['347'],
      guideSlugs: ['declaracion-347'],
    },
    {
      id: 't1',
      title: 'Declaraciones del 1er trimestre',
      rangeLabel: 'Del 1 al 20 de abril',
      start: { month: 4, day: 1 },
      end: { month: 4, day: 20 },
      modelCodes: ['303', '111', '115', '123', '130', '131', '349', '420', '425'],
      guideSlugs: ['cierre-trimestral-impuestos'],
    },
    {
      id: 'renta',
      title: 'Campaña de la Renta',
      rangeLabel: 'De principios de abril al 30 de junio',
      start: { month: 4, day: 2 },
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
      modelCodes: ['303', '111', '115', '123', '130', '131', '349', '420', '425'],
      guideSlugs: ['cierre-trimestral-impuestos'],
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
      modelCodes: ['303', '111', '115', '123', '130', '131', '349', '420', '425'],
      guideSlugs: ['cierre-trimestral-impuestos'],
    },
  ],
} as const satisfies { windows: readonly TaxCalendarWindow[] }
