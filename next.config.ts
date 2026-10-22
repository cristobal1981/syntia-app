import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // React Compiler: memoiza automáticamente. Los componentes que no puede compilar (p. ej. try/finally) se saltan sin error.
  reactCompiler: true,
  // LAN dev: permite HMR y assets desde IPs 192.168.x.y (otros PCs en red local)
  allowedDevOrigins: ['192.168.*.*'],
  cacheComponents: true,
  async headers() {
    return [
      {
        // Service worker: siempre la última versión y solo scripts propios.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
  experimental: {
    // Habilita forbidden() / unauthorized() y sus pantallas app/forbidden.tsx y app/unauthorized.tsx.
    authInterrupts: true,
    turbopackFileSystemCacheForBuild: true,
    serverActions: {
      // Default de Next es 1MB; el adjunto de alta de trabajador (DNI/pasaporte en base64) puede superarlo.
      bodySizeLimit: '8mb',
    },
  },
}

export default nextConfig
