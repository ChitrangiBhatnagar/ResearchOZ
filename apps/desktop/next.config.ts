import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@research-os/ui', '@research-os/shared', '@research-os/types', '@research-os/db'],
  reactStrictMode: true,
};

export default nextConfig;
