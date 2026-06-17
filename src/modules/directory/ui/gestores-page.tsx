import { listGestoresAction } from '@/src/modules/directory/application/directory-queries'
import { isUsingDirectoryMock } from '@/src/modules/directory/infrastructure/get-directory-repository'
import { GestoresPageView } from '@/src/modules/directory/ui/gestores-page-view'

export async function GestoresPage() {
  const gestores = await listGestoresAction()

  return (
    <GestoresPageView initialGestores={gestores} isMock={isUsingDirectoryMock()} />
  )
}
