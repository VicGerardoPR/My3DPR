import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Box, Zap } from 'lucide-react';
import { Locale, getDictionary } from '@/lib/i18n';
import { ProductCard } from '@/components/shop/ProductCard';
import { DataService } from '@/lib/supabase';

export default async function HomePage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const dict = getDictionary(lang);

  const [products, categories] = await Promise.all([DataService.getProducts(), DataService.getCategories()]);
  const trendingProducts = products.filter((p) => p.is_featured).slice(0, 4);
  const bestSellers = products.filter((p) => p.is_best_seller).slice(0, 4);

  return (
    <div className="space-y-16 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-dark-surface via-brand-dark to-brand-dark pt-12 pb-20 border-b border-brand-dark-border">
        {/* Glowing Background FX */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-cyan/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[200px] bg-brand-orange/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-brand-dark-card border border-brand-cyan/30 text-brand-cyan text-xs font-semibold px-4 py-1.5 rounded-full shadow-cyan-glow">
              <Zap className="w-3.5 h-3.5 fill-brand-cyan" />
              <span>{dict.hero.badge}</span>
            </div>

            <h1 className="font-heading font-black text-4xl sm:text-5xl xl:text-6xl tracking-tight leading-[1.1] text-slate-100">
              {dict.hero.titleLine1}{' '}
              <span className="bg-gradient-to-r from-brand-cyan via-white to-brand-orange bg-clip-text text-transparent drop-shadow-sm">
                {dict.hero.titleHighlight}
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {dict.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href={`/${lang || 'es'}/shop`}
                className="w-full sm:w-auto bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-extrabold text-sm px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-cyan-glow hover:scale-105 active:scale-95 transition-all"
              >
                <span>{dict.hero.ctaShop}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href={`/${lang || 'es'}/custom`}
                className="w-full sm:w-auto bg-brand-dark-card hover:bg-brand-dark-hover border border-brand-orange/40 text-brand-orange font-bold text-sm px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                <span>{dict.hero.ctaCustom}</span>
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="pt-6 border-t border-brand-dark-border/60 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <span className="font-heading font-extrabold text-2xl text-slate-100">3D</span>
                <p className="text-[11px] text-slate-400">Modelos hechos con detalle</p>
              </div>
              <div>
                <span className="font-heading font-extrabold text-2xl text-brand-cyan">100%</span>
                <p className="text-[11px] text-slate-400">Envíos PR & EE.UU.</p>
              </div>
              <div>
                <span className="font-heading font-extrabold text-2xl text-brand-orange">PR</span>
                <p className="text-[11px] text-slate-400">Hecho en Puerto Rico</p>
              </div>
            </div>
          </div>

          {/* Hero Showcase Image Grid */}
          <div className="relative mx-auto lg:ml-auto w-full max-w-lg">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden border-2 border-brand-cyan/40 shadow-card-3d group">
              <Image
                src="/images/dragon.jpg"
                alt="3D Printed Crystal Dragon Showcase"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-brand-dark-card/90 backdrop-blur-md rounded-2xl border border-brand-dark-border">
                <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">IMPRESIÓN 3D PERSONALIZADA</span>
                <h3 className="font-heading font-extrabold text-lg text-slate-100">
                  Convierte tu idea en una pieza 3D
                </h3>
                <div className="flex items-center justify-between mt-2">
                  <Link href={`/${lang || 'es'}/custom`} className="text-xs font-bold text-slate-950 bg-brand-cyan px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
                    Solicitar cotización
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-100 tracking-tight">
              {dict.sections.categoriesTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Explora nuestras colecciones especializadas en impresión 3D</p>
          </div>
          <Link href={`/${lang || 'es'}/shop`} className="text-xs font-bold text-brand-cyan hover:underline flex items-center gap-1">
            <span>Ver Todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${lang || 'es'}/shop?category=${cat.slug}`}
              className="group bg-brand-dark-card border border-brand-dark-border rounded-2xl p-3 text-center hover:border-brand-cyan/50 hover:shadow-cyan-glow/20 transition-all duration-300 flex flex-col items-center space-y-3"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-brand-dark border border-brand-dark-border group-hover:scale-110 transition-transform">
                <Image src={cat.image_url!} alt={cat.name_es} fill className="object-cover" />
              </div>
              <span className="font-heading font-bold text-xs text-slate-200 group-hover:text-brand-cyan transition-colors">
                {lang === 'en' ? cat.name_en : cat.name_es}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* TRENDING PRODUCTS */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-100 tracking-tight">
            {dict.sections.trendingTitle}
          </h2>
          <Link href={`/${lang || 'es'}/shop`} className="text-xs font-bold text-brand-cyan hover:underline">
            Ver Todos
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} lang={lang || 'es'} />
          ))}
        </div>
      </section>

      {/* BUILD YOUR BOX BANNER */}
      <section className="container mx-auto px-4">
        <div className="relative bg-gradient-to-r from-brand-dark-surface via-brand-dark-card to-brand-dark border-2 border-brand-orange/40 rounded-3xl p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 bg-brand-orange/20 border border-brand-orange/40 text-brand-orange font-bold text-xs px-3.5 py-1 rounded-full">
              <Box className="w-4 h-4" />
              NUEVA EXPERIENCIA BUILD-A-BOX
            </span>

            <h2 className="font-heading font-black text-3xl sm:text-4xl text-slate-100 leading-tight">
              {dict.sections.buildBoxTitle}
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed">
              {dict.sections.buildBoxSubtitle} Elije entre Mini Box (5 piezas) o Mega Collector Box (10 piezas) con empaque listo para regalo.
            </p>

            <div className="pt-2">
              <Link
                href={`/${lang || 'es'}/build-a-box`}
                className="bg-gradient-to-r from-brand-orange to-brand-orange-light text-slate-950 font-extrabold text-sm px-8 py-4 rounded-xl inline-flex items-center gap-2 shadow-orange-glow hover:scale-105 transition-all"
              >
                <span>Armar Mi Box Ahora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-100 tracking-tight">
            MÁS VENDIDOS EN PUERTO RICO
          </h2>
          <Link href={`/${lang || 'es'}/shop?filter=bestsellers`} className="text-xs font-bold text-brand-cyan hover:underline">
            Ver Catálogo
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} lang={lang || 'es'} />
          ))}
        </div>
      </section>

      {/* CUSTOM STUDIO SPOTLIGHT */}
      <section className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-brand-cyan-dark/30 via-brand-dark-surface to-brand-dark border border-brand-cyan/30 rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
              MY3D CUSTOM STUDIO
            </span>
            <h2 className="font-heading font-black text-3xl text-slate-100">
              {dict.sections.customBannerTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {dict.sections.customBannerSubtitle} Soportamos formatos .STL, .3MF, .OBJ y PDF. Nos encargamos del rebanado (slicing), selección de resinas o filamentos y acabado profesional.
            </p>
          </div>

          <div className="flex justify-start lg:justify-end">
            <Link
              href={`/${lang || 'es'}/custom`}
              className="bg-brand-cyan text-slate-950 font-extrabold text-sm px-8 py-4 rounded-xl flex items-center gap-2 hover:bg-white transition-colors shadow-cyan-glow"
            >
              <Sparkles className="w-4 h-4" />
              <span>Solicitar Cotización 3D</span>
            </Link>
          </div>
        </div>
      </section>


    </div>
  );
}
