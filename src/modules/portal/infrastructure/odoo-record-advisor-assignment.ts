import { getOdooTicketsModel } from '@/src/modules/tramites/infrastructure/tramites-env'
import { odooCall } from '@/src/modules/portal/infrastructure/odoo-json-client'

/** Asigna tarea/ticket al usuario interno Odoo (res.users.id). Best-effort en background. */
export async function assignRecordToAdvisorOdooUser(input: {
  resModel: string
  recordId: number
  odooUserId: number
}): Promise<void> {
  if (!Number.isInteger(input.odooUserId) || input.odooUserId <= 0) return

  try {
    if (input.resModel === 'project.task') {
      await odooCall<boolean>('project.task', 'write', {
        ids: [input.recordId],
        vals: { user_ids: [[6, 0, [input.odooUserId]]] },
      })
      return
    }

    const ticketModel = getOdooTicketsModel()
    if (input.resModel === ticketModel) {
      await odooCall<boolean>(ticketModel, 'write', {
        ids: [input.recordId],
        vals: { user_id: input.odooUserId },
      })
    }
  } catch (error) {
    console.warn(
      `[odoo] assign advisor user ${input.odooUserId} on ${input.resModel}/${input.recordId} failed:`,
      error
    )
  }
}
