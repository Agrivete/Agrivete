import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agrivete.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: [
          '/api/',
          '/admin',
          '/dashboard',
          '/sales',
          '/inventory',
          '/receiving',
          '/replenishments',
          '/suppliers',
          '/alerts',
          '/reports',
          '/users',
          '/settings',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

