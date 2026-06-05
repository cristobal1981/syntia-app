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
  // LAN dev: permite HMR y assets desde IPs 192.168.x.y (otros PCs en red local)
  allowedDevOrigins: ['192.168.*.*'],
}

export default nextConfig
