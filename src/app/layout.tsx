import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.my3dpr.site'),
  title: { default: 'MY3D.PR | Impresión 3D en Puerto Rico', template: '%s | MY3D.PR' },
  description: 'Tienda e-commerce oficial de MY3D.PR. Articulados, gaming, figuras anime, regalitos personalizados y Custom Studio con envíos a Puerto Rico y EE.UU.',
  keywords: ['Impresion 3D Puerto Rico', 'MY3D', '3D printing PR', 'Dragones articulados', 'Build a Box 3D', 'STL custom print'],
  openGraph: {
    title: 'MY3D.PR | 3D Printing Store & Custom Studio',
    description: 'Lleva tu imaginación al mundo real 3D con envíos rápidos a todo Puerto Rico y Estados Unidos.',
    images: ['/IMG_7897.jpg'],
  },
  alternates: {
    canonical: '/es',
    languages: { es: '/es', en: '/en', 'x-default': '/es' },
  },
  twitter: { card: 'summary_large_image', title: 'MY3D.PR | Impresión 3D en Puerto Rico' },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await headers()).get('x-my3d-locale') === 'en' ? 'en' : 'es';
  return (
    <html lang={locale} className="dark">
      <body className="bg-brand-dark text-slate-100 antialiased selection:bg-brand-cyan selection:text-slate-950 min-h-screen flex flex-col justify-between">
        {children}
      </body>
    </html>
  );
}
