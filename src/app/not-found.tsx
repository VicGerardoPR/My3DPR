import Link from 'next/link';

export const metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg text-center rounded-3xl border border-brand-dark-border bg-brand-dark-card p-10 space-y-4">
        <p className="text-brand-cyan font-black text-5xl">404</p>
        <h1 className="font-heading font-black text-2xl text-slate-100">Esta pieza no está en nuestro catálogo</h1>
        <p className="text-sm text-slate-400">La página o producto solicitado no existe, fue retirado o cambió de dirección.</p>
        <Link href="/es" className="inline-block rounded-xl bg-brand-cyan px-6 py-3 text-xs font-bold text-slate-950">Volver a MY3D.PR</Link>
      </div>
    </main>
  );
}
