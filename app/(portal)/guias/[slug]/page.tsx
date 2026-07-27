import { notFound, redirect } from 'next/navigation'

import { notImplementedPath } from '@/content/errors'
import { getSession } from '@/src/modules/auth/application/get-session'
import { getGuideBySlug } from '@/src/modules/guias/domain/guide-search'
import { FiscalModelsGuideView } from '@/src/modules/guias/ui/fiscal-models-guide-view'

type GuideRoutePageProps = {
  params: Promise<{ slug: string }>
}

export default async function GuideRoutePage({ params }: GuideRoutePageProps) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) {
    notFound()
  }

  if (guide.kind === 'fiscal-models') {
    return <FiscalModelsGuideView />
  }

  redirect(notImplementedPath)
}
