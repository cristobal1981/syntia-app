import { DIRECTORY_PAGE_SIZE } from '@/src/modules/directory/domain/types'
import {
  listAdvisorOptionsAction,
  listClientsPageAction,
} from '@/src/modules/directory/application/directory-queries'
import { ClientsPageView } from '@/src/modules/directory/ui/clients-page-view'

type ClientsPageProps = {
  canAssignAdvisor: boolean
}

export async function ClientsPage({ canAssignAdvisor }: ClientsPageProps) {
  const [page, advisorOptions] = await Promise.all([
    listClientsPageAction({ page: 1, pageSize: DIRECTORY_PAGE_SIZE }),
    canAssignAdvisor ? listAdvisorOptionsAction() : Promise.resolve([]),
  ])

  return (
    <ClientsPageView
      initialPage={page}
      advisorOptions={advisorOptions}
      canAssignAdvisor={canAssignAdvisor}
    />
  )
}
