import { unstable_cache } from 'next/cache'

import {
  fetchAdvisorPartnerIdByEmailFromOdoo,
  fetchAdvisorPartnerIdForEmail,
  fetchAdvisorPartnerIdsFromOdoo,
  fetchPartnerAvatarFromOdoo,
  isOdooInternalUserPartner,
  type PartnerAvatarPayload,
} from '@/src/modules/portal/infrastructure/odoo-partner-avatar'

const PARTNER_AVATAR_REVALIDATE_SECONDS = 86_400
const ADVISOR_PARTNER_IDS_REVALIDATE_SECONDS = 86_400

export function partnerAvatarCacheTag(partnerId: number): string {
  return `partner-avatar:${partnerId}`
}

export function advisorPartnerIdsCacheTag(): string {
  return 'advisor-partner-ids'
}

export async function getCachedPartnerAvatar(
  partnerId: number
): Promise<PartnerAvatarPayload | null> {
  const cached = unstable_cache(
    () => fetchPartnerAvatarFromOdoo(partnerId),
    ['partner-avatar', String(partnerId)],
    {
      revalidate: PARTNER_AVATAR_REVALIDATE_SECONDS,
      tags: [partnerAvatarCacheTag(partnerId)],
    }
  )

  return cached()
}

export async function getCachedAdvisorPartnerIds(): Promise<number[]> {
  const cached = unstable_cache(
    () => fetchAdvisorPartnerIdsFromOdoo(),
    ['advisor-partner-ids'],
    {
      revalidate: ADVISOR_PARTNER_IDS_REVALIDATE_SECONDS,
      tags: [advisorPartnerIdsCacheTag()],
    }
  )

  return cached()
}

export async function isCachedAdvisorPartner(partnerId: number): Promise<boolean> {
  const advisorIds = await getCachedAdvisorPartnerIds()
  if (advisorIds.includes(partnerId)) return true
  return isCachedOdooInternalUserPartner(partnerId)
}

export async function isCachedOdooInternalUserPartner(
  partnerId: number
): Promise<boolean> {
  const cached = unstable_cache(
    () => isOdooInternalUserPartner(partnerId),
    ['odoo-internal-user-partner', String(partnerId)],
    {
      revalidate: ADVISOR_PARTNER_IDS_REVALIDATE_SECONDS,
      tags: [advisorPartnerIdsCacheTag(), partnerAvatarCacheTag(partnerId)],
    }
  )

  return cached()
}

export async function getCachedAdvisorPartnerIdByEmail(
  email: string
): Promise<number | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const cachedMap = unstable_cache(
    () => fetchAdvisorPartnerIdByEmailFromOdoo(),
    ['advisor-partner-id-by-email'],
    {
      revalidate: ADVISOR_PARTNER_IDS_REVALIDATE_SECONDS,
      tags: [advisorPartnerIdsCacheTag()],
    }
  )

  const map = await cachedMap()
  const fromMap = map[normalized]
  if (fromMap) return fromMap

  const cachedLookup = unstable_cache(
    () => fetchAdvisorPartnerIdForEmail(normalized),
    ['advisor-partner-id-for-email', normalized],
    {
      revalidate: ADVISOR_PARTNER_IDS_REVALIDATE_SECONDS,
      tags: [advisorPartnerIdsCacheTag()],
    }
  )

  return cachedLookup()
}
