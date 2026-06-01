/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    domains: ['localhost'],
  },
  output: 'standalone',
}

module.exports = nextConfig
