import {
  countClientsByAdvisorAction,
  listGestoresPageAction,
} from '@/src/modules/directory/application/directory-queries'
import { DIRECTORY_PAGE_SIZE } from '@/src/modules/directory/domain/types'
import { GestoresPageView } from '@/src/modules/directory/ui/gestores-page-view'

export async function GestoresPage() {
  const [page, clientCounts] = await Promise.all([
    listGestoresPageAction({ page: 1, pageSize: DIRECTORY_PAGE_SIZE }),
    countClientsByAdvisorAction(),
  ])

  return <GestoresPageView initialPage={page} clientCounts={clientCounts} />
}
