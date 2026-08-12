'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Heart, User, Menu, X, Globe, Box, Sparkles, SlidersHorizontal } from 'lucide-react';
import { getDictionary, Locale } from '@/lib/i18n';
import { useCart } from '@/lib/cart-store';
import { useWishlist } from '@/lib/wishlist-store';
import type { Product } from '@/types';


export function Header({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang).nav;
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, setIsOpen: setCartOpen } = useCart();
  const { wishlistCount } = useWishlist();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const searchResults: Product[] = [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${lang}/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
    }
  };

  const switchLanguage = (newLang: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLang;
    router.push(segments.join('/'));
  };

  return (
    <header className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-brand-dark-border shadow-cyan-glow/10">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        {/* Mobile Menu Trigger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-slate-300 hover:text-brand-cyan p-2"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href={`/${lang || 'es'}`} className="flex items-center gap-2.5 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-brand-cyan/60 group-hover:border-brand-cyan transition-colors shadow-cyan-glow">
              <Image
                src="/IMG_7897.jpg"
                alt="MY3D.PR Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-xl tracking-tight leading-none bg-gradient-to-r from-brand-cyan via-white to-brand-orange bg-clip-text text-transparent">
                MY3D<span className="text-brand-cyan font-bold">.PR</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                3D PRINTING STORE
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <Link href={`/${lang || 'es'}`} className="text-slate-200 hover:text-brand-cyan transition-colors">
            {dict.home}
          </Link>
          <Link href={`/${lang || 'es'}/shop`} className="text-slate-200 hover:text-brand-cyan transition-colors">
            {dict.shop}
          </Link>
          <Link href={`/${lang || 'es'}/build-a-box`} className="flex items-center gap-1.5 text-brand-orange hover:text-brand-orange-light font-semibold transition-colors">
            <Box className="w-4 h-4" />
            {dict.buildBox}
          </Link>
          <Link href={`/${lang || 'es'}/custom`} className="flex items-center gap-1.5 text-brand-cyan hover:text-brand-cyan-light font-semibold transition-colors">
            <Sparkles className="w-4 h-4" />
            {dict.custom}
          </Link>
          <Link href={`/${lang || 'es'}/shop?filter=new`} className="text-slate-200 hover:text-brand-cyan transition-colors">
            {dict.newDrops}
          </Link>
          <Link href={`/${lang || 'es'}/shop?filter=sale`} className="text-slate-200 hover:text-brand-cyan transition-colors">
            {dict.offers}
          </Link>
        </nav>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-3">
          {/* Instant Search Form */}
          <div className="relative hidden md:block w-64 xl:w-80">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <input
                  type="text"
                  placeholder={dict.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="w-full bg-brand-dark-surface border border-brand-dark-border text-slate-200 placeholder-slate-400 text-xs rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </form>

            {/* Instant Search Suggestions Dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-brand-dark-card border border-brand-dark-border rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-brand-dark-border">
                  Sugerencias Rápidas
                </div>
                {searchResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${lang || 'es'}/product/${item.slug}`}
                    className="flex items-center justify-between p-2.5 hover:bg-brand-dark-hover transition-colors"
                  >
                    <span className="text-xs text-slate-200 font-medium truncate">
                      {lang === 'en' ? item.name_en : item.name_es}
                    </span>
                    <span className="text-xs text-brand-cyan font-bold">${item.price.toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => switchLanguage(lang === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-brand-cyan p-2 rounded-lg hover:bg-brand-dark-hover transition-colors"
            title="Cambiar idioma / Switch language"
          >
            <Globe className="w-4 h-4" />
            <span>{(lang || 'es').toUpperCase()}</span>
          </button>

          {/* Wishlist Icon */}
          <Link
            href={`/${lang || 'es'}/account?tab=wishlist`}
            className="relative text-slate-300 hover:text-brand-cyan p-2 rounded-lg hover:bg-brand-dark-hover transition-colors"
            aria-label="Ver Favoritos"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-1 right-1 bg-brand-orange text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Account / Admin Icon */}
          <Link
            href={`/${lang || 'es'}/account`}
            className="text-slate-300 hover:text-brand-cyan p-2 rounded-lg hover:bg-brand-dark-hover transition-colors"
            aria-label="Mi Cuenta"
          >
            <User className="w-5 h-5" />
          </Link>

          {/* Cart Icon Drawer Trigger */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-bold text-xs px-3.5 py-2 rounded-full hover:shadow-cyan-glow transition-all active:scale-95"
            aria-label="Ver Carrito de Compras"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{dict.cart}</span>
            {itemCount > 0 && (
              <span className="bg-slate-950 text-brand-cyan text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-brand-dark-border bg-brand-dark-surface p-4 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
          <form onSubmit={handleSearchSubmit} className="mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder={dict.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-dark-card border border-brand-dark-border text-slate-200 text-xs rounded-lg pl-9 pr-4 py-2.5"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </form>

          <nav className="flex flex-col gap-3 font-medium text-slate-200 text-sm">
            <Link
              href={`/${lang || 'es'}`}
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-brand-dark-hover rounded-lg"
            >
              {dict.home}
            </Link>
            <Link
              href={`/${lang || 'es'}/shop`}
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-brand-dark-hover rounded-lg"
            >
              {dict.shop}
            </Link>
            <Link
              href={`/${lang || 'es'}/build-a-box`}
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-brand-dark-hover rounded-lg text-brand-orange font-semibold flex items-center gap-2"
            >
              <Box className="w-4 h-4" />
              {dict.buildBox}
            </Link>
            <Link
              href={`/${lang || 'es'}/custom`}
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-brand-dark-hover rounded-lg text-brand-cyan font-semibold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {dict.custom}
            </Link>
            <Link
              href={`/${lang || 'es'}/admin`}
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-brand-dark-hover rounded-lg text-slate-400 text-xs flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {dict.admin}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
