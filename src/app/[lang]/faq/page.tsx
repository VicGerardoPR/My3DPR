import { Locale } from '@/lib/i18n';

export default function FAQPage({ params: { lang } }: { params: { lang: Locale } }) {
  const faqs = [
    {
      q: '¿Cuánto tiempo tarda en llegar mi pedido en Puerto Rico?',
      a: 'Para artículos listos para envío (Ready to Ship), el pedido se despacha en 24h y llega en 1-3 días laborables por USPS.'
    },
    {
      q: '¿Puedo pagar por ATH Móvil?',
      a: '¡Sí! Aceptamos ATH Móvil en el checkout. Solo selecciona ATH Móvil como método de pago y sigue las instrucciones para enviar la transferencia.'
    },
    {
      q: '¿Cómo puedo enviar mi propio diseño 3D para imprimir?',
      a: 'Entra a nuestra pestaña "Custom Studio 3D" en el menú, sube tu archivo .STL o .3MF y te enviaremos una cotización sin compromiso.'
    },
    {
      q: '¿Los productos articulados requieren ensamblaje?',
      a: 'No. Todos nuestros articulados y dragones flexibles se imprimen en una sola pieza de forma articulada directa desde la impresora (Print-in-Place).'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
      <h1 className="font-heading font-black text-3xl text-slate-100">Preguntas Frecuentes (FAQ)</h1>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl space-y-2">
            <h3 className="font-heading font-bold text-base text-brand-cyan">{faq.q}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
