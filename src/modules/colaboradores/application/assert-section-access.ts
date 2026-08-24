import { redirect } from 'next/navigation'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'

/**
 * Sustituye el `if (role !== 'client') redirect(...)` repetido en las páginas
 * delegables: el titular siempre pasa; un colaborador solo si tiene la
 * sección concedida y vigente; cualquier otro rol se redirige igual que antes.
 */
export async function assertSectionAccess(
  session: PortalSession,
  href: WorkerSectionHref
): Promise<void> {
  if (session.user.role === 'client') {
    return
  }

  if (session.user.role === 'worker') {
    const allowed = await getAllowedSectionsForWorker(session.user)
    if (allowed.has(href)) {
      return
    }
  }

  redirect('/dashboard')
}
