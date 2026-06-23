import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { FiscalModelsGuidePageView } from '@/src/modules/obligaciones/ui/fiscal-models-guide-page-view'

export default async function FiscalModelsGuideRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <FiscalModelsGuidePageView />
}
