import type { Metadata, Viewport } from 'next'
import { Archivo, Host_Grotesk } from 'next/font/google'

import { AccessibilityProvider } from '@/components/providers/accessibility-provider'
import { AccessibilityScript } from '@/components/providers/accessibility-script'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ViewAsLaunchHost } from '@/src/modules/auth/ui/view-as-launch-host'
import './globals.css'

const hostGrotesk = Host_Grotesk({
  subsets: ['latin'],
  variable: '--font-host-grotesk',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['300', '400', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Syntia',
  description:
    'Plataforma digital de asesoría. Digitaliza. Innova. Crece.',
  icons: {
    icon: [
      { url: '/brand/favicon.ico', sizes: '48x48' },
      { url: '/brand/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      {
        url: '/brand/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  manifest: '/brand/site.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Syntia',
    statusBarStyle: 'default',
  },
}

// Colores de --background de globals.css (claro y oscuro) para la barra del
// navegador y la de estado al instalar.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafcfc' },
    { media: '(prefers-color-scheme: dark)', color: '#001f20' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${hostGrotesk.variable} ${archivo.variable} bg-background`}
    >
      <body className={`${archivo.className} antialiased`}>
        <AccessibilityScript />
        <ThemeProvider>
          <AccessibilityProvider>
            {children}
            <ViewAsLaunchHost />
          </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
