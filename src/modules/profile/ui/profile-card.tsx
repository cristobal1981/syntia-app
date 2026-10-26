import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ProfileCardProps = {
  id: string
  title: string
  description?: string
  /** Acción del panel, a la derecha del título. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Un panel del perfil: título (y su acción) arriba y el contenido debajo. */
export function ProfileCard({ id, title, description, action, className, children }: ProfileCardProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'rounded-xl border border-border bg-card p-5 md:p-6 dark:border-transparent',
        className
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id={id} className="font-sans text-base font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
