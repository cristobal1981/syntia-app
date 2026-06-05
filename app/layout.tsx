import type { Metadata } from 'next'
import { Archivo, Host_Grotesk } from 'next/font/google'
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${hostGrotesk.variable} ${archivo.variable} bg-background`}
    >
      <body className={`${archivo.className} antialiased`}>{children}</body>
    </html>
  )
}
