import { Locale } from '@/lib/i18n';

export default function TermsPage({ params: { lang } }: { params: { lang: Locale } }) {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6 text-slate-300 text-sm leading-relaxed">
      <h1 className="font-heading font-black text-3xl text-slate-100">Términos y Condiciones de Servicio</h1>
      <p className="text-xs text-slate-400">Última actualización: Agosto 2026</p>

      <div className="space-y-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <h2 className="font-heading font-bold text-lg text-slate-100">1. Condiciones Generales</h2>
        <p>Al realizar un pedido en MY3D.PR aceptas nuestros términos de fabricación, envíos e impresiones personalizadas.</p>

        <h2 className="font-heading font-bold text-lg text-slate-100">2. Tolerancias y Acabados de Impresión 3D</h2>
        <p>Los productos impresos en 3D mediante tecnología FDM o Resina pueden presentar líneas de capa sutiles inherentes al proceso de adición de filamento. Esto no constituye un defecto de fábrica sino la naturaleza artesanal y tecnológica del material.</p>
      </div>
    </div>
  );
}
