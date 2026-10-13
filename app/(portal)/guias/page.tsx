import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { getRelevantTaxWindows } from '@/src/modules/guias/domain/tax-calendar'
import { GuiasHubView } from '@/src/modules/guias/ui/guias-hub-view'

export default async function GuiasRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/guias')

  const relevantWindows = getRelevantTaxWindows(new Date())

  return <GuiasHubView relevantWindows={relevantWindows} />
}
