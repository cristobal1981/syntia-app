import { ErrorScreen } from "@/components/errors/error-screen"
import { errorPages } from "@/content/errors"

export default function NotFound() {
  const page = errorPages[404]

  return (
    <ErrorScreen
      code={page.code}
      title={page.title}
      description={page.description}
      image={page.image}
      imageAlt={page.imageAlt}
      primaryHref={page.primaryHref}
      primaryLabel={page.primaryLabel}
    />
  )
}
