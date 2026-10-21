import { prepareTramiteDescription } from '@/src/modules/tramites/domain/prepare-tramite-description'
import {
  getOdooBaseUrl,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooTaskDescriptionRow = {
  id: number
  description?: string | false | null
}

/**
 * Descripción de una tarea (una lectura por trámite, solo al abrir el
 * drawer: el listado no la pide). El acceso del cliente a la tarea se
 * comprueba antes, en la acción.
 */
export async function fetchTramiteDescription(
  taskId: number
): Promise<string | null> {
  const rows = await odooSearchRead<OdooTaskDescriptionRow>('project.task', {
    domain: [['id', '=', taskId]],
    fields: ['description'],
    limit: 1,
  })

  return prepareTramiteDescription(rows[0]?.description, getOdooBaseUrl())
}
