'use client';

import { useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant, Coupon } from '@/types';
import { DEMO_COUPONS } from './seed-data';

const CART_STORAGE_KEY = 'my3d_cart_v1';
const COUPON_STORAGE_KEY = 'my3d_coupon_v1';
export const FREE_SHIPPING_THRESHOLD = 50.00;

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
      const savedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);
      if (savedCoupon) setAppliedCoupon(JSON.parse(savedCoupon));
    } catch (e) {
      console.error('Failed to parse cart storage', e);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, mounted]);

  useEffect(() => {
    if (mounted) {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    }
  }, [appliedCoupon, mounted]);

  const addItem = (
    product: Product,
    variant?: ProductVariant,
    quantity = 1,
    customText?: string,
    customNotes?: string,
    isBoxBundle = false,
    boxTemplateId?: string
  ) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          i.product_id === product.id &&
          i.variant_id === variant?.id &&
          i.custom_text === customText &&
          i.is_box_bundle === isBoxBundle
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      const newItem: CartItem = {
        id: 'cart-' + Math.random().toString(36).substring(2, 9),
        product_id: product.id,
        product,
        variant_id: variant?.id,
        variant,
        quantity,
        custom_text: customText,
        custom_notes: customNotes,
        is_box_bundle: isBoxBundle,
        box_template_id: boxTemplateId,
      };

      return [...prev, newItem];
    });
    setIsOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const found = DEMO_COUPONS.find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase() && c.active
    );
    if (!found) {
      return { success: false, message: 'Cupón inválido o expirado.' };
    }
    setAppliedCoupon(found);
    return { success: true, message: `Cupón ${found.code} aplicado con éxito.` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const subtotal = items.reduce((acc, item) => {
    const unitPrice = item.variant?.sale_price || item.variant?.price || item.product.sale_price || item.product.price;
    return acc + unitPrice * item.quantity;
  }, 0);

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'PERCENTAGE') {
      discount = (subtotal * appliedCoupon.discount_value) / 100;
    } else if (appliedCoupon.discount_type === 'FIXED') {
      discount = Math.min(subtotal, appliedCoupon.discount_value);
    }
  }

  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || appliedCoupon?.discount_type === 'FREE_SHIPPING';
  const shippingCost = subtotal > 0 ? (isFreeShipping ? 0 : 4.99) : 0;
  const estimatedTax = (subtotal - discount) * 0.115; // 11.5% IVU PR default
  const total = Math.max(0, subtotal - discount + shippingCost + estimatedTax);

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return {
    items,
    itemCount,
    subtotal,
    discount,
    shippingCost,
    estimatedTax,
    total,
    isFreeShipping,
    freeShippingNeeded: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
    isOpen,
    setIsOpen,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    appliedCoupon,
    mounted,
  };
}
