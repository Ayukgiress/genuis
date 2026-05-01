import type { NextConfig } from "next";

// Validate and normalize API URL to ensure HTTPS
function getApiUrl(): string {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!apiUrl) {
    // Fallback to production URL
    apiUrl = 'https://genius-backen-production.up.railway.app';
    console.warn('[next.config.ts] NEXT_PUBLIC_API_URL not set, using default production URL');
  } else {
    // Force HTTPS to prevent mixed content errors
    if (apiUrl.startsWith('http://')) {
      console.warn('[next.config.ts] WARNING: NEXT_PUBLIC_API_URL uses HTTP. Changing to HTTPS for security.');
      apiUrl = apiUrl.replace(/^http:/, 'https:');
    }
    
    // Validate URL format
    if (!apiUrl.startsWith('https://')) {
      console.error('[next.config.ts] ERROR: NEXT_PUBLIC_API_URL must start with https://');
      apiUrl = 'https://genius-backen-production.up.railway.app';
    }
  }
  
  console.log('[next.config.ts] Using API URL:', apiUrl);
  return apiUrl;
}

const API_BASE_URL = getApiUrl();

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
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
