import { listWorkersForStaff } from '@/src/modules/colaboradores/application/list-workers-for-staff'
import { ColaboradoresStaffPageView } from '@/src/modules/colaboradores/ui/colaboradores-staff-page-view'

export async function ColaboradoresStaffPage() {
  const workers = await listWorkersForStaff()

  return <ColaboradoresStaffPageView initialWorkers={workers} />
}
