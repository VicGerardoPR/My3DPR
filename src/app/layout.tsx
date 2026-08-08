import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: 'MY3D.PR | Impresión 3D de Alta Calidad & Custom Studio en Puerto Rico',
  description: 'Tienda e-commerce oficial de MY3D.PR. Articulados, gaming, figuras anime, regalitos personalizados y Custom Studio con envíos a Puerto Rico y EE.UU.',
  keywords: ['Impresion 3D Puerto Rico', 'MY3D', '3D printing PR', 'Dragones articulados', 'Build a Box 3D', 'STL custom print'],
  openGraph: {
    title: 'MY3D.PR | 3D Printing Store & Custom Studio',
    description: 'Lleva tu imaginación al mundo real 3D con envíos rápidos a todo Puerto Rico y Estados Unidos.',
    images: ['/IMG_7897.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} dark`}>
      <body className="bg-brand-dark text-slate-100 antialiased selection:bg-brand-cyan selection:text-slate-950 min-h-screen flex flex-col justify-between">
        {children}
      </body>
    </html>
  );
}
