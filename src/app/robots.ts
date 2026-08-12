import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.my3dpr.site';
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/es/', '/en/'], disallow: ['/api/', '/es/admin/', '/en/admin/', '/es/checkout/', '/en/checkout/', '/es/account/', '/en/account/'] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
