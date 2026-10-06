import { fetchLeadReport } from '@/src/modules/leads/infrastructure/lead-report.supabase'
import type { LeadReport } from '@/src/modules/leads/domain/types'

export async function getLeadReport(): Promise<LeadReport> {
  return fetchLeadReport()
}
