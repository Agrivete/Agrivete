import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: ['lucide-react'],
  },
  // Allow pdfkit and csv-writer to run in Node.js API routes
  serverExternalPackages: ['pdfkit', 'csv-writer', 'mongoose'],
  async headers() {
    return [
      {
        source: '/api/dashboard',
        headers: [
          {
            key: 'Cache-Control',
            // Browser: no caching (per-user credentialed data).
            // Edge/CDN: short shared-max with SWR fallback.
            value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/api/alerts',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/api/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

