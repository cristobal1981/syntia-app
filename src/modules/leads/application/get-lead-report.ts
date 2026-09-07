import { buildLeadReport } from '@/src/modules/leads/application/build-lead-report'
import { listConvertedOdooPartnerIds } from '@/src/modules/leads/infrastructure/converted-partners.supabase'
import { listLatestContactByLead } from '@/src/modules/leads/infrastructure/lead-contacts.supabase'
import { listLeads } from '@/src/modules/leads/infrastructure/leads.supabase'
import type { LeadReport } from '@/src/modules/leads/domain/types'

export async function getLeadReport(): Promise<LeadReport> {
  const [leads, convertedPartnerIds, lastContactByLead] = await Promise.all([
    listLeads(),
    listConvertedOdooPartnerIds(),
    listLatestContactByLead(),
  ])

  return buildLeadReport(leads, convertedPartnerIds, lastContactByLead)
}
