import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
  // React Compiler: memoiza automáticamente. Los componentes que no puede compilar (p. ej. try/finally) se saltan sin error.
  reactCompiler: true,
  // LAN dev: permite HMR y assets desde IPs 192.168.x.y (otros PCs en red local)
  allowedDevOrigins: ['192.168.*.*'],
  // Default de Next es 1MB; el adjunto de alta de trabajador (DNI/pasaporte en base64) puede superarlo.
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForBuild: true,
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
}

export default nextConfig
