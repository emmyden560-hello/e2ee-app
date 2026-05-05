import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'https://whisperbox.koyeb.app',
      },
    ];
  },
  reactCompiler: true,
};

export default nextConfig;
