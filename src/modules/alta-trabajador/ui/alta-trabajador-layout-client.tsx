'use client'

import type { ReactNode } from 'react'

import { AltaTrabajadorWizardProvider } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'

type AltaTrabajadorLayoutClientProps = {
  children: ReactNode
}

export function AltaTrabajadorLayoutClient({
  children,
}: AltaTrabajadorLayoutClientProps) {
  return <AltaTrabajadorWizardProvider>{children}</AltaTrabajadorWizardProvider>
}
