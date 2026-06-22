export function getObligacionesParentPrefix(): string {
  return (
    process.env.ODOO_OBLIGACIONES_PARENT_PREFIX?.trim() ||
    'Obligaciones Fiscales'
  )
}

export function getObligacionesPeriodNames(): string[] {
  const raw =
    process.env.ODOO_OBLIGACIONES_PERIOD_NAMES?.trim() ||
    'Trimestral,Periodos,Anual'
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}
