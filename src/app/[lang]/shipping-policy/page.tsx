import { Locale } from '@/lib/i18n';

export default async function ShippingPolicyPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const isEnglish = lang === 'en';
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6 text-slate-300 text-sm leading-relaxed">
      <h1 className="font-heading font-black text-3xl text-slate-100">{isEnglish ? 'Shipping & Returns Policy' : 'Política de Envíos & Devoluciones'}</h1>

      <div className="space-y-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <h2 className="font-heading font-bold text-lg text-slate-100">{isEnglish ? 'Shipping to Puerto Rico & the United States' : 'Envíos a Puerto Rico y Estados Unidos'}</h2>
        <p>{isEnglish
          ? 'All orders ship from Puerto Rico via USPS Ground Advantage or USPS Priority Mail. Estimated transit time is 2–5 business days after production is complete.'
          : 'Todos los pedidos se despachan desde Puerto Rico vía USPS Ground Advantage o USPS Priority Mail. El tiempo de tránsito estimado es de 2 a 5 días laborables una vez completada la producción.'}</p>

        <h2 className="font-heading font-bold text-lg text-slate-100">{isEnglish ? 'Free Shipping' : 'Envío Gratis'}</h2>
        <p>{isEnglish
          ? 'Free shipping applies to orders with a subtotal of $50.00 USD or more delivered to addresses in Puerto Rico and the United States. Orders below $50.00 USD have a flat $4.99 USD shipping charge.'
          : 'El envío es gratis en compras cuyo subtotal sea de $50.00 USD o más para direcciones en Puerto Rico y Estados Unidos. Los pedidos con subtotal menor de $50.00 USD tienen una tarifa fija de envío de $4.99 USD.'}</p>
      </div>
    </div>
  );
}
