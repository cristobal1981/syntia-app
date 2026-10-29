import type { ReactNode } from 'react'

/**
 * Bloque de un formulario con su título. El título es la `legend` del `fieldset`; una `legend` no es un
 * elemento flex, así que el hueco del `gap` no la separa del primer campo y lleva su propio margen.
 */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="mb-4 font-sans text-base font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  )
}
