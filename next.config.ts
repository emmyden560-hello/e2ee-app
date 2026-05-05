import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'https://koyeb.app',
      },
    ];
  },
  reactCompiler: true,
};

export default nextConfig;
