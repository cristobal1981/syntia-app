import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { HomeData } from '@/src/modules/portal/domain/types'

export function getHomeDataForRole(user: PortalUser): HomeData {
  switch (user.role) {
    case 'client':
      return {
        role: 'client',
        stats: [
          { label: 'Documentos pendientes', value: 3, hint: '2 por firmar' },
          { label: 'Trámites activos', value: 2 },
          { label: 'Mensajes sin leer', value: 1 },
        ],
        deadlines: [
          { title: 'IVA trimestral Q1', date: '15 abr', status: 'urgent' },
          { title: 'Renovación seguro social', date: '22 abr', status: 'pending' },
          { title: 'Acta junta ordinaria', date: '30 abr', status: 'pending' },
        ],
      }
    case 'admin':
      return {
        role: 'admin',
        stats: [
          { label: 'Usuarios en equipo', value: 5 },
          { label: 'Solicitudes abiertas', value: 4 },
          { label: 'Documentos compartidos', value: 28 },
        ],
        team: [
          { name: 'Elena Vidal', role: 'Cliente', status: 'active' },
          { name: 'Miguel Ortega', role: 'Cliente', status: 'active' },
          { name: 'Sara Núñez', role: 'Invitada', status: 'invited' },
        ],
        integrations: [
          { name: 'Odoo', status: 'connected' },
          { name: 'Google Drive', status: 'connected' },
        ],
      }
    case 'advisor':
      return {
        role: 'advisor',
        stats: [
          { label: 'Clientes activos', value: 24 },
          { label: 'Tareas hoy', value: 7 },
          { label: 'Docs por revisar', value: 11 },
        ],
        clients: [
          { name: 'Acme Industrial', company: 'Acme Industrial', pendingTasks: 2 },
          { name: 'Nova Labs', company: 'Nova Labs S.L.', pendingTasks: 1 },
          { name: 'Helios Retail', company: 'Helios Retail', pendingTasks: 4 },
        ],
        queueItems: [
          'Sincronización documentos Drive → Odoo',
          'Recordatorio vencimiento IVA (Acme)',
          'Alta cliente Nova Labs en portal',
        ],
        integrations: [
          { name: 'n8n', status: 'connected' },
          { name: 'Odoo', status: 'connected' },
        ],
      }
  }
}
