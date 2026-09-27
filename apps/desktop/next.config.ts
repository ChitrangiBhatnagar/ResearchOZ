import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@research-os/ui', '@research-os/shared', '@research-os/types', '@research-os/db'],
  serverExternalPackages: ['@libsql/client', 'libsql', 'better-sqlite3'],
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/api/**/*': ['./demo/researchos-demo.db'],
  },
};

export default nextConfig;
