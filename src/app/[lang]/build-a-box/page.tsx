import Link from 'next/link';
import { Box, Settings } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import { DataService } from '@/lib/supabase';

export default async function BuildABoxPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const [templates, products] = await Promise.all([DataService.getBoxTemplates(), DataService.getProducts()]);
  const ready = templates.length > 0 && products.length > 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-brand-dark-border bg-brand-dark-card p-8 text-center sm:p-12">
        <Box className="mx-auto h-12 w-12 text-brand-orange" />
        <h1 className="mt-5 font-heading text-3xl font-black text-slate-100">Build Your Box</h1>
        {ready ? (
          <p className="mt-4 text-sm text-slate-300">{lang === 'en' ? 'Bundle templates are configured. The secure bundle checkout flow is being activated.' : 'Los templates de bundles están configurados. El checkout seguro de bundles está siendo activado.'}</p>
        ) : (
          <>
            <div className="mx-auto mt-5 flex max-w-md items-start gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-4 text-left">
              <Settings className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
              <p className="text-xs leading-relaxed text-slate-300">{lang === 'en' ? 'No real bundle templates or eligible products are configured yet. This feature is unavailable rather than showing sample products or prices.' : 'Aún no hay templates reales ni productos elegibles configurados. Esta función permanece no disponible en vez de mostrar productos o precios de prueba.'}</p>
            </div>
            <Link href={`/${lang}/shop`} className="mt-6 inline-flex rounded-xl bg-brand-cyan px-6 py-3 text-xs font-black text-slate-950">{lang === 'en' ? 'VISIT SHOP' : 'VISITAR TIENDA'}</Link>
          </>
        )}
      </div>
    </div>
  );
}
