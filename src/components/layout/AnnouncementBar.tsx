'use client';

import { Truck, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function AnnouncementBar({ lang }: { lang: 'es' | 'en' }) {
  return (
    <div className="bg-gradient-to-r from-brand-dark-surface via-brand-cyan-dark/40 to-brand-dark-surface border-b border-brand-cyan/20 text-xs py-2 px-4 text-slate-200 flex items-center justify-between">
      <div className="container mx-auto flex items-center justify-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 font-semibold text-brand-cyan">
          <Truck className="w-3.5 h-3.5" />
          {lang === 'es' ? 'ENVÍOS GRATIS a Puerto Rico & EE.UU. en compras mayores de $50' : 'FREE SHIPPING to PR & USA on orders over $50'}
        </span>
        <span className="hidden md:inline-block text-slate-500">•</span>
        <Link
          href={`/${lang}/build-a-box`}
          className="hidden md:inline-flex items-center gap-1 text-brand-orange hover:underline font-medium"
        >
          <Sparkles className="w-3 h-3" />
          {lang === 'es' ? 'Prueba Build-a-Box y ahorra hasta 25%' : 'Try Build-a-Box & save up to 25%'}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
