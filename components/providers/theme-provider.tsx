'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'

function isAuthPath(pathname: string | null): boolean {
  if (!pathname) return false
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/auth/')
  )
}

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const pathname = usePathname()
  const forcedTheme = isAuthPath(pathname) ? 'dark' : undefined

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="syntia-theme"
      forcedTheme={forcedTheme}
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </NextThemesProvider>
  )
}
