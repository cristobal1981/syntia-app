import {
  listAdvisorOptionsAction,
  listClientsAction,
} from '@/src/modules/directory/application/directory-queries'
import { ClientsPageView } from '@/src/modules/directory/ui/clients-page-view'

type ClientsPageProps = {
  canAssignAdvisor: boolean
}

export async function ClientsPage({ canAssignAdvisor }: ClientsPageProps) {
  const [clients, advisorOptions] = await Promise.all([
    listClientsAction(),
    canAssignAdvisor ? listAdvisorOptionsAction() : Promise.resolve([]),
  ])

  return (
    <ClientsPageView
      initialClients={clients}
      advisorOptions={advisorOptions}
      canAssignAdvisor={canAssignAdvisor}
    />
  )
}
