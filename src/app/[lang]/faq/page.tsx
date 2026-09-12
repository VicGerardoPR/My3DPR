import type { Locale } from '@/lib/i18n';

export default async function FAQPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const faqs = lang === 'en' ? [
    { q: 'When will my order arrive?', a: 'Review the product listing and shipping information before ordering. For a specific delivery date, contact the store before purchasing.' },
    { q: 'Which payment methods are available?', a: 'Available payment methods are shown at checkout. Options may vary according to provider availability and configuration.' },
    { q: 'How can I request a custom 3D print?', a: 'Describe your project in Custom Studio 3D to request a quote. The form indicates whether file uploads are available.' },
    { q: 'Do articulated products require assembly?', a: 'Check the product description for assembly and usage information. Ask the store if you need clarification before ordering.' },
  ] : [
    { q: '¿Cuándo llegará mi pedido?', a: 'Consulta la ficha del producto y la información de envío antes de comprar. Si necesitas una fecha específica, contacta al comercio antes de realizar tu pedido.' },
    { q: '¿Qué métodos de pago están disponibles?', a: 'Los métodos de pago disponibles se muestran en checkout. Las opciones pueden variar según la disponibilidad y configuración del proveedor.' },
    { q: '¿Cómo solicito una impresión 3D personalizada?', a: 'Describe tu proyecto en Custom Studio 3D para solicitar una cotización. El formulario indica si la carga de archivos está disponible.' },
    { q: '¿Los productos articulados requieren ensamblaje?', a: 'Consulta la descripción del producto para conocer sus indicaciones de ensamblaje y uso. Si tienes dudas, consulta al comercio antes de comprar.' },
  ];
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
      <h1 className="font-heading font-black text-3xl text-slate-100">{lang === 'en' ? 'Frequently Asked Questions' : 'Preguntas Frecuentes'}</h1>
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.q} className="bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl space-y-2">
            <h2 className="font-heading font-bold text-base text-brand-cyan">{faq.q}</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
