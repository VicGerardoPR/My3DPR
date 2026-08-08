'use client';

import { useState, useEffect } from 'react';

const WISHLIST_STORAGE_KEY = 'my3d_wishlist_v1';

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) setWishlistIds(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse wishlist storage', e);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    }
  }, [wishlistIds, mounted]);

  const toggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  return {
    wishlistIds,
    wishlistCount: wishlistIds.length,
    toggleWishlist,
    isInWishlist,
    mounted,
  };
}
