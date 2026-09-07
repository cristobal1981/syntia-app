import {
  listClientsAction,
  listGestoresAction,
} from '@/src/modules/directory/application/directory-queries'
import { GestoresPageView } from '@/src/modules/directory/ui/gestores-page-view'

export async function GestoresPage() {
  const [gestores, clients] = await Promise.all([
    listGestoresAction(),
    listClientsAction(),
  ])

  const clientCounts: Record<string, number> = {}
  for (const client of clients) {
    if (!client.advisorId) continue
    clientCounts[client.advisorId] = (clientCounts[client.advisorId] ?? 0) + 1
  }

  return <GestoresPageView initialGestores={gestores} clientCounts={clientCounts} />
}
