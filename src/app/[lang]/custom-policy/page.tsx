import { Locale } from '@/lib/i18n';

export default function CustomPolicyPage({ params: { lang } }: { params: { lang: Locale } }) {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6 text-slate-300 text-sm leading-relaxed">
      <h1 className="font-heading font-black text-3xl text-slate-100">Política de Trabajos Custom & Cotizaciones 3D</h1>

      <div className="space-y-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <h2 className="font-heading font-bold text-lg text-slate-100">1. Aprobación y Pago de Cotización</h2>
        <p>Una vez emitida una cotización por MY3D Custom Studio, la orden pasará a producción 3D inmediatamente tras recibir el pago correspondiente.</p>

        <h2 className="font-heading font-bold text-lg text-slate-100">2. Cambios de Diseño</h2>
        <p>Modificaciones mayores en el archivo 3D una vez iniciada la impresión pueden conllevar costos adicionales de filamento o tiempo de máquina.</p>
      </div>
    </div>
  );
}
