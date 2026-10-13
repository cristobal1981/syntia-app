import type { Metadata } from 'next'

import { ErrorStage } from '@/components/errors/error-stage'
import { errorPages } from '@/content/errors'

export const metadata: Metadata = {
  title: 'Próximamente | Syntia',
  description: errorPages.wip.description,
  robots: { index: false, follow: true },
}

export default function ProximamentePage() {
  return <ErrorStage variant="wip" />
}
