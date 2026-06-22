import type { ReactNode } from 'react'

type RequiredFieldLabelProps = {
  htmlFor: string
  children: ReactNode
}

export function RequiredFieldLabel({ htmlFor, children }: RequiredFieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
      <span
        className="text-turquesa dark:text-primary"
        aria-hidden="true"
      >
        {' '}
        *
      </span>
    </label>
  )
}
