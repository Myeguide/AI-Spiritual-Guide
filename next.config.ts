import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces `.next/standalone` for lightweight deployments (no full `node_modules` on the server)
  output: 'standalone',
};

export default nextConfig;
