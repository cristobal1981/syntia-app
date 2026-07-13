export function getObligacionesParentPrefix(): string {
  return (
    process.env.ODOO_OBLIGACIONES_PARENT_PREFIX?.trim() ||
    'Obligaciones Fiscales'
  )
}
