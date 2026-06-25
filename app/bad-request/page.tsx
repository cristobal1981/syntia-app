import type { Metadata } from 'next'

import { TechErrorScreen } from '@/components/errors/tech-error-screen'
import { errorPages } from '@/content/errors'

const page = errorPages[400]

export const metadata: Metadata = {
  title: 'Petición incorrecta | Syntia',
  description: page.description,
  robots: { index: false, follow: true },
}

export default function BadRequestPage() {
  return (
    <TechErrorScreen
      code={page.code}
      title={page.title}
      description={page.description}
      playHint={page.playHint}
      primaryHref={page.primaryHref}
      primaryLabel={page.primaryLabel}
      backdropVariant="repel"
    />
  )
}
