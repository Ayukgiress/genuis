import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: {
    turbo: {
      noTurbopackDevWatcher: true,
    },
  } as any,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://genius-backen.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;
