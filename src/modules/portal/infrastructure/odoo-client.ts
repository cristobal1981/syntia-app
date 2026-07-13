/**
 * @deprecated Usa el módulo `tramites` y `odoo-json-client`.
 */
export type { TramiteTask as OdooTask } from '@/src/modules/tramites/domain/types'

export interface OdooClient {
  listOpenTasks(clientId: string): Promise<never>
}

export const odooClient: OdooClient = {
  async listOpenTasks() {
    throw new Error('Odoo client no configurado')
  },
}
