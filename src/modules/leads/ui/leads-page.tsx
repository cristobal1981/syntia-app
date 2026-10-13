import { getLeadReport } from '@/src/modules/leads/application/get-lead-report'
import { LeadsPageView } from '@/src/modules/leads/ui/leads-page-view'

export async function LeadsPage() {
  const report = await getLeadReport()

  return <LeadsPageView report={report} />
}
