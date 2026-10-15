'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import {
  getRemainingInvitations,
  MAX_INVITATIONS_PER_CLIENT,
} from '@/src/modules/invitations/domain/invitation-rules'
import { countInvitationsByInviter } from '@/src/modules/invitations/infrastructure/client-invitations.supabase'

export type ClientInvitationQuotaResult =
  | { ok: true; max: number; remaining: number }
  | { ok: false; error: 'forbidden' | 'unavailable' }

/** Cupo de invitaciones que le quedan al cliente, para mostrarlo al abrir el diálogo. */
export async function getClientInvitationQuotaAction(): Promise<ClientInvitationQuotaResult> {
  const session = await getSession()
  if (!session || session.user.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  try {
    const sent = await countInvitationsByInviter(session.user.id)
    return {
      ok: true,
      max: MAX_INVITATIONS_PER_CLIENT,
      remaining: getRemainingInvitations(sent),
    }
  } catch (error) {
    console.error('[client-invitation] no se pudo leer el cupo', {
      message: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, error: 'unavailable' }
  }
}
