export default function ShippingPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6 text-slate-300 text-sm leading-relaxed">
      <h1 className="font-heading font-black text-3xl text-slate-100">Política de Envíos & Devoluciones</h1>

      <div className="space-y-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <h2 className="font-heading font-bold text-lg text-slate-100">Envíos a Puerto Rico & Estados Unidos</h2>
        <p>Todos los pedidos son despachados desde nuestro centro en Puerto Rico vía USPS Ground Advantage o USPS Priority Mail. El tiempo de tránsito estimado es de 2 a 5 días laborables una vez completada la producción.</p>

        <h2 className="font-heading font-bold text-lg text-slate-100">Envío Gratis</h2>
        <p>Ofrecemos Envío Gratis en compras cuyo subtotal supere los $50.00 USD dirigidas a direcciones en PR y EE.UU.</p>
      </div>
    </div>
  );
}
