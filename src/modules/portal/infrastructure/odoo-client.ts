/**
 * Contrato Odoo (ERP/tareas). Implementación real vía env ODOO_URL.
 * Supabase: users + profiles; Odoo: operaciones de gestoría.
 */

export type OdooTask = {
  id: string
  title: string
  clientId: string
  dueDate?: string
  status: 'open' | 'done'
}

export interface OdooClient {
  listOpenTasks(clientId: string): Promise<OdooTask[]>
}

export const odooClient: OdooClient = {
  async listOpenTasks() {
    throw new Error('Odoo client no configurado')
  },
}
