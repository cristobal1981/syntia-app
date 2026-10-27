/**
 * Contactos de Odoo a los que se avisa por correo al publicar un mensaje: solo los responsables
 * reales del registro, calculados en el servidor. Lo que mande el navegador se usa únicamente para
 * elegir entre ellos; un id que no sea responsable se descarta, para que nadie pueda hacer llegar su
 * texto por correo a cualquier contacto de Odoo (otros clientes incluidos).
 */
export function restrictNotifyPartnerIds(
  requested: readonly number[],
  assignees: readonly number[]
): number[] {
  const allowed = new Set(assignees)
  return [...new Set(requested)].filter(
    (partnerId) => Number.isInteger(partnerId) && partnerId > 0 && allowed.has(partnerId)
  )
}
