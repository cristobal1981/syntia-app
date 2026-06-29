import { profile } from '@/content/profile'
import { cn } from '@/lib/utils'
import type { AdvisorPresenceStatus } from '@/src/modules/profile/domain/advisor-presence'

const PRESENCE_RING = 'shadow-[0_0_0_2px_var(--card)]'

const PRESENCE_DOT_CLASS: Record<
  Exclude<AdvisorPresenceStatus, 'busy'>,
  string
> = {
  online: 'bg-primary',
  away: 'bg-amber-400',
  offline: 'bg-neutral-400 dark:bg-neutral-500',
}

type AdvisorPresenceDotProps = {
  status: AdvisorPresenceStatus
  className?: string
  withBorder?: boolean
}

export function AdvisorPresenceDot({
  status,
  className,
  withBorder = true,
}: AdvisorPresenceDotProps) {
  const label = profile.advisorPresence[status]
  const ringClass = withBorder ? PRESENCE_RING : undefined

  if (status === 'busy') {
    return (
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-full bg-[#e25349] dark:bg-[#e86a62]',
          ringClass,
          className
        )}
        role="img"
        aria-label={label}
        title={label}
      >
        <span
          className="block h-[2px] w-[62%] rounded-full bg-[#041d23]"
          aria-hidden
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'block size-2.5 shrink-0 rounded-full',
        PRESENCE_DOT_CLASS[status],
        ringClass,
        className
      )}
      role="img"
      aria-label={label}
      title={label}
    />
  )
}
