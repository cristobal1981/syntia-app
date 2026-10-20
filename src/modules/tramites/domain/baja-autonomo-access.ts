/** Días tras la fecha de baja indicada en los que se conserva el acceso a la plataforma. */
export const BAJA_AUTONOMO_ACCESS_GRACE_DAYS = 5

/** Último día recomendado para descargar la información: la fecha de baja más el margen (ISO `YYYY-MM-DD`). */
export function bajaAutonomoDownloadDeadline(desiredDate: string): string {
  const [year, month, day] = desiredDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + BAJA_AUTONOMO_ACCESS_GRACE_DAYS))
  return date.toISOString().slice(0, 10)
}
