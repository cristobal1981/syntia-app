import { notFound, redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { getGuideBySlug } from '@/src/modules/guias/domain/guide-search'
import { FiscalModelsGuideView } from '@/src/modules/guias/ui/fiscal-models-guide-view'
import { GuideDetailView } from '@/src/modules/guias/ui/guide-detail-view'

type GuideRoutePageProps = {
  params: Promise<{ slug: string }>
}

export default async function GuideRoutePage({ params }: GuideRoutePageProps) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/guias')

  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) {
    notFound()
  }

  if (guide.kind === 'fiscal-models') {
    return <FiscalModelsGuideView />
  }

  return <GuideDetailView guide={guide} />
}
