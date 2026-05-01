import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  turbopack: {},
  webpack: (config) => {
    config.watchOptions = {
      ignored: [/node_modules/, /\.next/],
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/:path*` : 'https://genius-backen-production.up.railway.app/:path*',
      },
    ];
  },
};

export default nextConfig;
