import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartProvider } from '@/lib/cart-store';
import { Locale } from '@/lib/i18n';

export default async function LangLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Locale = rawLang === 'en' ? 'en' : 'es';
  return (
    <CartProvider>
      <AnnouncementBar lang={lang} />
      <Header lang={lang} />
      <main className="flex-1">{children}</main>
      <Footer lang={lang} />
      <CartDrawer lang={lang} />
    </CartProvider>
  );
}
