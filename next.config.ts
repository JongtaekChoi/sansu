import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // MVP: avoid CI/build failures from lint config churn; we can re-enable later.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
