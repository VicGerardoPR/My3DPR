export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6 text-slate-300 text-sm leading-relaxed">
      <h1 className="font-heading font-black text-3xl text-slate-100">Política de Privacidad - MY3D.PR</h1>
      <p className="text-xs text-slate-400">Última actualización: Agosto 2026 • San Juan, Puerto Rico</p>

      <div className="space-y-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <h2 className="font-heading font-bold text-lg text-slate-100">1. Recopilación de Información</h2>
        <p>En MY3D.PR recopilamos datos personales únicamente necesarios para procesar tus órdenes de compra, gestionar cotizaciones de modelos 3D y despachar envíos a Puerto Rico y Estados Unidos.</p>

        <h2 className="font-heading font-bold text-lg text-slate-100">2. Archivos 3D y Propiedad Intelectual</h2>
        <p>Los archivos .STL, .3MF, .OBJ o documentos subidos a nuestro Custom Studio son de propiedad exclusiva del cliente. No compartiremos, venderemos ni reutilizaremos tus diseños privados para otros propósitos.</p>

        <h2 className="font-heading font-bold text-lg text-slate-100">3. Seguridad de Pagos</h2>
        <p>No almacenamos datos completos de tarjetas. Los métodos de pago disponibles se muestran únicamente cuando han sido configurados y verificados; las órdenes de pago manual permanecen pendientes hasta confirmación del comercio.</p>
      </div>
    </div>
  );
}
