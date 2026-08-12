import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.my3dpr.site';
  const routes = ['', '/shop', '/build-a-box', '/custom', '/faq', '/privacy', '/terms', '/shipping-policy', '/custom-policy'];
  const entries: MetadataRoute.Sitemap = routes.flatMap((route) => ['es', 'en'].map((lang) => ({ url: `${base}/${lang}${route}`, changeFrequency: route === '' || route === '/shop' ? 'daily' : 'monthly', priority: route === '' ? 1 : 0.7 })));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const { data } = await createClient(url, key).from('products').select('slug,updated_at').not('status', 'in', '(OUT_OF_STOCK,COMING_SOON)');
    for (const product of data || []) for (const lang of ['es', 'en']) entries.push({ url: `${base}/${lang}/product/${product.slug}`, lastModified: product.updated_at, changeFrequency: 'weekly', priority: 0.8 });
  }
  return entries;
}
