'use client'

import type { ReactNode } from 'react'

import { AltaAutonomoWizardProvider } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-context'

type AltaAutonomoLayoutClientProps = {
  children: ReactNode
}

export function AltaAutonomoLayoutClient({ children }: AltaAutonomoLayoutClientProps) {
  return <AltaAutonomoWizardProvider>{children}</AltaAutonomoWizardProvider>
}
