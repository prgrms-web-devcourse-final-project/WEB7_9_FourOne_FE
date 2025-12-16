import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 빌드 시 ESLint 검사를 비활성화 (선택사항)
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    // 빌드 시 TypeScript 검사를 비활성화 (선택사항)
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
