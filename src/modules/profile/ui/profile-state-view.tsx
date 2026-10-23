import { profile } from '@/content/profile'
import { cn } from '@/lib/utils'

type ProfileStateError = 'forbidden' | 'not_linked' | 'odoo_unavailable'

const STATE_COPY: Record<
  Exclude<ProfileStateError, 'forbidden'>,
  { title: string; description: string }
> = {
  not_linked: {
    title: profile.states.notLinked.title,
    description: profile.states.notLinked.description,
  },
  odoo_unavailable: {
    title: profile.states.odooUnavailable.title,
    description: profile.states.odooUnavailable.description,
  },
}

type ProfileStateViewProps = {
  error: ProfileStateError
}

export function ProfileStateView({ error }: ProfileStateViewProps) {
  if (error === 'forbidden') {
    return null
  }

  const copy = STATE_COPY[error]

  return (
    <div
      className={cn(
        'portal-home-card rounded-xl px-6 py-10 text-center',
        error === 'odoo_unavailable' && 'border-destructive/30'
      )}
    >
      <h2 className="font-sans text-lg font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
    </div>
  )
}
