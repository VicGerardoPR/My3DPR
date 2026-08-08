'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Instagram, Facebook, Send, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { getDictionary, Locale } from '@/lib/i18n';

export function Footer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang).footer;

  return (
    <footer className="bg-brand-dark border-t border-brand-dark-border text-slate-400 text-sm">
      {/* Top Value Banner */}
      <div className="border-b border-brand-dark-border bg-brand-dark-surface/50 py-8">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-base">{lang === 'en' ? 'PR & USA Shipping' : 'Envíos PR & EE.UU.'}</h4>
              <p className="text-xs text-slate-400">{lang === 'en' ? 'Fast dispatches via USPS' : 'Despachos rápidos por USPS'}</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-base">{lang === 'en' ? '100% Secure Checkout' : 'Pagos Seguros'}</h4>
              <p className="text-xs text-slate-400">Stripe, PayPal & ATH Móvil</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center text-brand-green shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-base">{lang === 'en' ? 'Quality Guarantee' : 'Garantía de Calidad'}</h4>
              <p className="text-xs text-slate-400">{lang === 'en' ? 'Hand-inspected 3D prints' : 'Impresión 3D probada pieza a pieza'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-brand-cyan">
              <Image src="/IMG_7897.jpg" alt="MY3D Logo" fill className="object-cover" />
            </div>
            <span className="font-heading font-extrabold text-2xl bg-gradient-to-r from-brand-cyan to-white bg-clip-text text-transparent">
              MY3D<span className="text-brand-cyan">.PR</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            {dict.tagline}
          </p>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-cyan" />
              <span>San Juan, Puerto Rico (00901)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-cyan" />
              <span>info@my3d.pr</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand-cyan" />
              <span>(787) 555-MY3D</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://instagram.com/my3d.pr"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-xl bg-brand-dark-card border border-brand-dark-border flex items-center justify-center text-slate-300 hover:text-brand-cyan hover:border-brand-cyan transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-xl bg-brand-dark-card border border-brand-dark-border flex items-center justify-center text-slate-300 hover:text-brand-cyan hover:border-brand-cyan transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 className="font-heading font-bold text-slate-200 text-sm mb-4 uppercase tracking-wider">
            {dict.quickLinks}
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link href={`/${lang || 'es'}/shop`} className="hover:text-brand-cyan transition-colors">{lang === 'en' ? '3D Catalog' : 'Catálogo 3D'}</Link></li>
            <li><Link href={`/${lang || 'es'}/build-a-box`} className="hover:text-brand-orange transition-colors font-medium">Build Your Box</Link></li>
            <li><Link href={`/${lang || 'es'}/custom`} className="hover:text-brand-cyan transition-colors font-medium">Custom Studio 3D</Link></li>
            <li><Link href={`/${lang || 'es'}/shop?filter=new`} className="hover:text-brand-cyan transition-colors">{lang === 'en' ? 'New Drops' : 'Nuevos Lanzamientos'}</Link></li>
            <li><Link href={`/${lang || 'es'}/shop?filter=sale`} className="hover:text-brand-cyan transition-colors">{lang === 'en' ? 'On Sale' : 'Ofertas & Clearance'}</Link></li>
          </ul>
        </div>

        {/* Column 3: Legal & Policies */}
        <div>
          <h4 className="font-heading font-bold text-slate-200 text-sm mb-4 uppercase tracking-wider">
            {dict.legal}
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link href={`/${lang || 'es'}/privacy`} className="hover:text-brand-cyan transition-colors">{dict.privacy}</Link></li>
            <li><Link href={`/${lang || 'es'}/terms`} className="hover:text-brand-cyan transition-colors">{dict.terms}</Link></li>
            <li><Link href={`/${lang || 'es'}/shipping-policy`} className="hover:text-brand-cyan transition-colors">{dict.shippingPolicy}</Link></li>
            <li><Link href={`/${lang || 'es'}/custom-policy`} className="hover:text-brand-cyan transition-colors">{lang === 'en' ? 'Custom Order Policy' : 'Política de Trabajos Custom'}</Link></li>
            <li><Link href={`/${lang || 'es'}/faq`} className="hover:text-brand-cyan transition-colors">FAQ / Preguntas Frecuentes</Link></li>
          </ul>
        </div>

        {/* Column 4: Newsletter */}
        <div>
          <h4 className="font-heading font-bold text-slate-200 text-sm mb-4 uppercase tracking-wider">
            Newsletter 3D
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            {lang === 'en' ? 'Get exclusive coupons & new drops weekly.' : 'Recibe cupones exclusivos y nuevos modelos cada semana.'}
          </p>
          <form onSubmit={(e) => { e.preventDefault(); alert(lang === 'en' ? 'Thank you for subscribing!' : '¡Gracias por suscribirte!'); }} className="space-y-2">
            <div className="relative">
              <input
                type="email"
                placeholder="tu@email.com"
                required
                className="w-full bg-brand-dark-card border border-brand-dark-border text-slate-200 text-xs rounded-xl px-3 py-2.5 pr-10 focus:outline-none focus:border-brand-cyan"
              />
              <button type="submit" className="absolute right-2 top-2 text-brand-cyan hover:text-white p-1">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Bar & Payment Badges */}
      <div className="border-t border-brand-dark-border py-6 bg-brand-dark-surface">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MY3D.PR. {dict.rights}</p>
          <div className="flex items-center gap-3 font-semibold text-slate-400">
            <span className="px-2 py-1 bg-brand-dark-card rounded border border-brand-dark-border text-[10px]">VISA</span>
            <span className="px-2 py-1 bg-brand-dark-card rounded border border-brand-dark-border text-[10px]">MASTERCARD</span>
            <span className="px-2 py-1 bg-brand-dark-card rounded border border-brand-dark-border text-[10px]">AMEX</span>
            <span className="px-2 py-1 bg-brand-dark-card rounded border border-brand-dark-border text-[10px]">PAYPAL</span>
            <span className="px-2 py-1 bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan rounded text-[10px] font-bold">ATH MÓVIL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
