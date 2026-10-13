'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="syntia-theme"
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </NextThemesProvider>
  )
}
