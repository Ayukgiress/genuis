import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
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
