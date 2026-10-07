import type { Metadata } from 'next'

import { ErrorStage } from '@/components/errors/error-stage'
import { errorPages } from '@/content/errors'

export const metadata: Metadata = {
  title: 'Petición incorrecta | Syntia',
  description: errorPages[400].description,
  robots: { index: false, follow: true },
}

export default function BadRequestPage() {
  return <ErrorStage variant="400" />
}
