'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { isPortalDarkThemeEnabled } from '@/src/modules/portal/domain/portal-theme-flags'

const darkThemeEnabled = isPortalDarkThemeEnabled()

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
  const forceDarkOnAuth = isAuthPath(pathname)
  const forcedTheme = forceDarkOnAuth
    ? 'dark'
    : !darkThemeEnabled
      ? 'light'
      : undefined

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={darkThemeEnabled ? 'system' : 'light'}
      enableSystem={darkThemeEnabled}
      storageKey="syntia-theme"
      forcedTheme={forcedTheme}
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </NextThemesProvider>
  )
}
