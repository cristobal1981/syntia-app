import { listGestoresAction } from '@/src/modules/directory/application/directory-queries'
import { GestoresPageView } from '@/src/modules/directory/ui/gestores-page-view'

export async function GestoresPage() {
  const gestores = await listGestoresAction()

  return <GestoresPageView initialGestores={gestores} />
}
