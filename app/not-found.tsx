import { NotFoundScreen } from '@/components/errors/not-found-screen'
import { errorPages } from '@/content/errors'

export default function NotFound() {
  const page = errorPages[404]

  return (
    <NotFoundScreen
      code={page.code}
      title={page.title}
      description={page.description}
      playHint={page.playHint}
      primaryHref={page.primaryHref}
      primaryLabel={page.primaryLabel}
    />
  )
}
