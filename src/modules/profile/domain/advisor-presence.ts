export type AdvisorPresenceStatus = 'online' | 'away' | 'busy' | 'offline'

/** Mapea `res.users.im_status` (Discuss) a los 4 estados del portal. */
export function mapOdooImStatus(
  imStatus: string | false | null | undefined
): AdvisorPresenceStatus {
  const raw = typeof imStatus === 'string' ? imStatus.trim().toLowerCase() : ''

  if (!raw || raw === 'offline' || raw === 'im_partner') {
    return 'offline'
  }

  if (raw === 'busy') {
    return 'busy'
  }

  const normalized = raw.startsWith('leave_') ? raw.slice('leave_'.length) : raw

  if (normalized === 'online' || raw === 'bot') {
    return 'online'
  }

  if (normalized === 'away') {
    return 'away'
  }

  return 'offline'
}
