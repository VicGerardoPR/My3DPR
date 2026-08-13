'use client';

import { useState, use } from 'react';
import { Upload, Sparkles, CheckCircle, FileCode } from 'lucide-react';
import { Locale, dictionaries } from '@/lib/i18n';


export default function CustomStudioPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const dict = dictionaries[lang].custom;

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    project_name: '',
    description: '',
    desired_size: '',
    quantity: 1,
    colors: '',
    material: 'PLA Premium',
    budget: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const valid = selected.filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ['stl', '3mf', 'obj', 'zip', 'pdf', 'png', 'jpg'].includes(ext || '');
      });
      setFiles(valid);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length > 0) {
      setErrorMessage('La carga privada de archivos todavía no está habilitada. Envía la solicitud sin archivos o contacta al administrador.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/custom-quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...formData, quantity: Number(formData.quantity), budget: formData.budget ? Number(formData.budget) : undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No fue posible registrar la solicitud.');
      setSubmittedRequestNumber(result.requestNumber);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No fue posible registrar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-xs font-bold px-4 py-1.5 rounded-full">
          <Sparkles className="w-4 h-4" />
          <span>MY3D CUSTOM STUDIO</span>
        </div>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-slate-100">
          {dict.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          {dict.subtitle} Sube tus archivos 3D (.STL, .3MF, .OBJ) o describe tu proyecto para recibir una cotización formal sin compromiso en 24h.
        </p>
      </div>

      {submittedRequestNumber ? (
        <div className="bg-brand-dark-card border-2 border-brand-cyan rounded-3xl p-8 text-center space-y-4 shadow-cyan-glow animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-brand-cyan/20 border border-brand-cyan text-brand-cyan mx-auto flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="font-heading font-black text-2xl text-slate-100">
            ¡Solicitud Enviada con Éxito!
          </h2>
          <p className="text-sm text-slate-300">
            Número de Cotización Registrado: <span className="font-bold text-brand-cyan">{submittedRequestNumber}</span>
          </p>
          <p className="text-xs text-slate-400">
            Hemos recibido tus especificaciones. Nuestro equipo revisará el modelo en software de rebanado 3D y te enviará la cotización por correo electrónico.
          </p>
          <button
            onClick={() => {
              setSubmittedRequestNumber(null);
              setFormData({
                customer_name: '',
                customer_email: '',
                customer_phone: '',
                project_name: '',
                description: '',
                desired_size: '',
                quantity: 1,
                colors: '',
                material: 'PLA Premium',
                budget: '',
              });
              setFiles([]);
            }}
            className="text-xs font-bold bg-brand-cyan text-slate-950 px-6 py-3 rounded-xl hover:bg-white transition-colors"
          >
            Enviar Otra Solicitud
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl">
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nombre Completo *</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Ej. Carlos Rivera"
                className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 text-xs rounded-xl px-3.5 py-3 focus:border-brand-cyan focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                placeholder="carlos@gmail.com"
                className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 text-xs rounded-xl px-3.5 py-3 focus:border-brand-cyan focus:outline-none"
              />
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4 pt-4 border-t border-brand-dark-border">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nombre del Proyecto *</label>
              <input
                type="text"
                required
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                placeholder="Ej. Protoboard Enclosure / Figura Mech Custom"
                className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 text-xs rounded-xl px-3.5 py-3 focus:border-brand-cyan focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Descripción & Especificaciones *</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explica detalles del proyecto, tamaño aproximado (cm), rellenos (infill %) y requerimientos especiales..."
                className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 text-xs rounded-xl p-3.5 focus:border-brand-cyan focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="space-y-2 pt-4 border-t border-brand-dark-border">
            <label className="text-xs font-semibold text-slate-300 block">
              Adjuntar Archivos 3D (.STL, .3MF, .OBJ, .ZIP)
            </label>
            <div className="border-2 border-dashed border-brand-cyan/40 hover:border-brand-cyan bg-brand-dark/50 rounded-2xl p-6 text-center space-y-2 relative transition-colors">
              <input
                type="file"
                multiple
                accept=".stl,.3mf,.obj,.zip,.pdf,.png,.jpg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-8 h-8 text-brand-cyan mx-auto" />
              <p className="text-xs font-semibold text-slate-200">{dict.fileUpload}</p>
              <p className="text-[11px] text-slate-400">La carga privada de archivos estará disponible cuando el almacenamiento sea configurado.</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-1 pt-2">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-brand-cyan bg-brand-cyan/10 p-2 rounded-xl border border-brand-cyan/20">
                    <FileCode className="w-4 h-4" />
                    <span className="font-semibold">{f.name}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-extrabold text-sm py-4 rounded-2xl shadow-cyan-glow hover:scale-102 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Procesando...' : dict.submit}</span>
          </button>
          {errorMessage && <p role="alert" className="text-xs text-red-400">{errorMessage}</p>}
        </form>
      )}
    </div>
  );
}
